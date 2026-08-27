import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';

export type GestureType = 'wave' | 'nod' | 'laugh' | 'think' | 'cheer' | 'lookAround';
export type IdleAnimationType = 'blink' | 'headTilt' | 'lookAround' | 'shySmile' | 'curiousNod' | 'sigh';

export interface InteractionManagerOptions {
  camera: THREE.Camera;
  domElement: HTMLElement;
  targetObject?: THREE.Object3D | null;
  vrm?: VRM | null;
  enabled?: boolean;
  cooldownMs?: number;
  idleTimeoutMs?: number; // Inactivity threshold (default 30,000ms = 30 seconds)
  onInteract?: (gesture: GestureType, hitPoint?: THREE.Vector3) => void;
  onIdleTrigger?: (idleAnimation: IdleAnimationType) => void;
  onHoverChange?: (isHovering: boolean) => void;
}

/**
 * Manages pointer events and raycasting on 3D VRM models to trigger
 * interactive gestures, look-at responses, and automatic idle animations
 * (like head tilts, blinks, and look-arounds) after 30 seconds of inactivity.
 */
export class InteractionManager {
  private camera: THREE.Camera;
  private domElement: HTMLElement;
  private targetObject: THREE.Object3D | null = null;
  private vrm: VRM | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private enabled: boolean = true;
  private cooldownMs: number = 1200;
  private lastInteractionTime: number = performance.now();
  private isHovered: boolean = false;
  private isDisposed: boolean = false;

  // Inactivity tracking (30 seconds default)
  private idleTimeoutMs: number = 30000;
  private idleCheckInterval: number | null = null;
  private isPlayingIdleAnimation: boolean = false;
  private activeIdleCancelFn: (() => void) | null = null;

  private pointerDownPos = { x: 0, y: 0, time: 0 };
  private maxClickDistance = 10; // max pixel drift for a tap/click vs drag
  private maxClickDuration = 400; // ms

  private onInteract?: (gesture: GestureType, hitPoint?: THREE.Vector3) => void;
  private onIdleTrigger?: (idleAnimation: IdleAnimationType) => void;
  private onHoverChange?: (isHovering: boolean) => void;

  private gestureCycle: GestureType[] = ['wave', 'think', 'nod', 'laugh', 'cheer', 'lookAround'];
  private currentGestureIndex = 0;

  constructor(options: InteractionManagerOptions) {
    this.camera = options.camera;
    this.domElement = options.domElement;
    this.targetObject = options.targetObject || null;
    this.vrm = options.vrm || null;
    this.enabled = options.enabled ?? true;
    this.cooldownMs = options.cooldownMs ?? 1200;
    this.idleTimeoutMs = options.idleTimeoutMs ?? 30000;
    this.onInteract = options.onInteract;
    this.onIdleTrigger = options.onIdleTrigger;
    this.onHoverChange = options.onHoverChange;

    this.bindEvents();
    this.startIdleTimer();
  }

  public setCamera(camera: THREE.Camera) {
    this.camera = camera;
  }

  public setTarget(target: THREE.Object3D | null, vrm: VRM | null = null) {
    this.targetObject = target;
    if (vrm) this.vrm = vrm;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled && this.isHovered) {
      this.isHovered = false;
      this.domElement.style.cursor = '';
      this.onHoverChange?.(false);
    }
  }

  public resetInactivityTimer() {
    this.lastInteractionTime = performance.now();
  }

  private bindEvents() {
    this.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.domElement.addEventListener('pointerup', this.handlePointerUp);
    this.domElement.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    this.domElement.addEventListener('pointerleave', this.handlePointerLeave);
  }

  private unbindEvents() {
    this.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.domElement.removeEventListener('pointerleave', this.handlePointerLeave);
  }

  private startIdleTimer() {
    if (this.idleCheckInterval !== null) {
      clearInterval(this.idleCheckInterval);
    }
    // Check every second for 30s inactivity
    this.idleCheckInterval = window.setInterval(() => {
      this.checkInactivity();
    }, 1000);
  }

  private checkInactivity() {
    if (this.isDisposed || !this.enabled || !this.targetObject || this.isPlayingIdleAnimation) {
      return;
    }

    const timeSinceLastInteraction = performance.now() - this.lastInteractionTime;
    if (timeSinceLastInteraction >= this.idleTimeoutMs) {
      this.triggerRandomIdleAnimation();
    }
  }

  private updateNormalizedCoords(event: PointerEvent | MouseEvent | Touch) {
    const rect = this.domElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.mouse.x = (x / rect.width) * 2 - 1;
    this.mouse.y = -(y / rect.height) * 2 + 1;
  }

  private handlePointerDown = (e: PointerEvent) => {
    if (!this.enabled || e.button !== 0) return;
    this.pointerDownPos = {
      x: e.clientX,
      y: e.clientY,
      time: performance.now(),
    };
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (!this.enabled || e.button !== 0) return;

    const dx = e.clientX - this.pointerDownPos.x;
    const dy = e.clientY - this.pointerDownPos.y;
    const distance = Math.hypot(dx, dy);
    const duration = performance.now() - this.pointerDownPos.time;

    // Must be a clean click, not a camera orbit/drag
    if (distance <= this.maxClickDistance && duration <= this.maxClickDuration) {
      this.handleClick(e);
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.enabled || !this.targetObject) return;

    this.updateNormalizedCoords(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.targetObject, true);

    const hit = intersects.length > 0;
    if (hit !== this.isHovered) {
      this.isHovered = hit;
      this.domElement.style.cursor = hit ? 'pointer' : '';
      this.onHoverChange?.(hit);
    }
  };

  private handlePointerLeave = () => {
    if (this.isHovered) {
      this.isHovered = false;
      this.domElement.style.cursor = '';
      this.onHoverChange?.(false);
    }
  };

  private handleClick(e: PointerEvent) {
    if (!this.targetObject) return;

    const now = performance.now();
    if (now - this.lastInteractionTime < this.cooldownMs) {
      return; // Under cooldown to prevent spamming
    }

    this.updateNormalizedCoords(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.targetObject, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      this.lastInteractionTime = now;

      // Cancel any ongoing idle animation if user clicked
      if (this.activeIdleCancelFn) {
        this.activeIdleCancelFn();
        this.activeIdleCancelFn = null;
      }
      this.isPlayingIdleAnimation = false;

      this.triggerAvatarReaction(hit.point);
    }
  }

  /**
   * Determines and executes a contextual response based on the hit point.
   */
  public triggerAvatarReaction(hitPoint?: THREE.Vector3) {
    let chosenGesture: GestureType = 'wave';

    if (hitPoint && this.targetObject) {
      // Determine vertical region of the model
      this.targetObject.traverse((child) => { if (!child.parent) child.parent = null; });
      this.targetObject.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(this.targetObject);
      const height = box.max.y - box.min.y;
      const relativeY = (hitPoint.y - box.min.y) / (height || 1);

      if (relativeY > 0.75) {
        // Head / Face area -> nod, laugh, think, or look around
        const headGestures: GestureType[] = ['nod', 'think', 'laugh', 'lookAround'];
        chosenGesture = headGestures[Math.floor(Math.random() * headGestures.length)];
      } else if (relativeY > 0.45) {
        // Chest / Upper Torso / Arms -> wave, cheer
        const torsoGestures: GestureType[] = ['wave', 'cheer', 'wave'];
        chosenGesture = torsoGestures[Math.floor(Math.random() * torsoGestures.length)];
      } else {
        // Lower body -> cheer or look around
        chosenGesture = Math.random() > 0.5 ? 'cheer' : 'lookAround';
      }
    } else {
      // Rotate through idle gestures
      chosenGesture = this.gestureCycle[this.currentGestureIndex % this.gestureCycle.length];
      this.currentGestureIndex++;
    }

    this.executeGesture(chosenGesture, hitPoint);
  }

  /**
   * Triggers a random idle animation (head tilt, blink flutter, look around, shy smile, etc.)
   * when 30 seconds of inactivity elapse.
   */
  public triggerRandomIdleAnimation() {
    if (this.isDisposed || this.isPlayingIdleAnimation) return;

    this.lastInteractionTime = performance.now();
    this.isPlayingIdleAnimation = true;

    const idleAnimations: IdleAnimationType[] = [
      'headTilt',
      'blink',
      'lookAround',
      'shySmile',
      'curiousNod',
      'sigh',
    ];
    const chosen = idleAnimations[Math.floor(Math.random() * idleAnimations.length)];

    console.log(`[InteractionManager] 30s idle inactivity reached. Triggering idle animation: "${chosen}"`);

    this.onIdleTrigger?.(chosen);

    window.dispatchEvent(
      new CustomEvent('lyraIdleAnimation', {
        detail: {
          animation: chosen,
          timestamp: Date.now(),
        },
      })
    );

    const onComplete = () => {
      this.isPlayingIdleAnimation = false;
      this.activeIdleCancelFn = null;
      this.lastInteractionTime = performance.now();
    };

    switch (chosen) {
      case 'headTilt':
        this.performHeadTiltAnimation(onComplete);
        break;
      case 'blink':
        this.performBlinkFlutterAnimation(onComplete);
        break;
      case 'lookAround':
        this.performLookAroundAnimation(onComplete);
        break;
      case 'shySmile':
        this.performShySmileAnimation(onComplete);
        break;
      case 'curiousNod':
        this.performCuriousNodAnimation(onComplete);
        break;
      case 'sigh':
      default:
        this.performSighAnimation(onComplete);
        break;
    }
  }

  // --- Idle Animation Implementations ---

  private performHeadTiltAnimation(onComplete: () => void) {
    const headNode = this.vrm?.humanoid?.getNormalizedBoneNode('head');
    const neckNode = this.vrm?.humanoid?.getNormalizedBoneNode('neck');
    const expr = this.vrm?.expressionManager;

    if (!headNode) {
      onComplete();
      return;
    }

    const direction = Math.random() > 0.5 ? 1 : -1;
    const targetRoll = direction * (0.16 + Math.random() * 0.08); // Z tilt
    const targetPitch = 0.04 + Math.random() * 0.04; // slight pitch
    const targetYaw = direction * 0.06; // slight yaw

    const duration = 2400; // ms total
    const startTime = performance.now();
    let isCancelled = false;

    if (expr) {
      expr.setValue('relaxed', 0.6);
      expr.setValue('happy', 0.3);
    }

    const animate = () => {
      if (isCancelled || this.isDisposed) return;
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Smooth bell curve envelope: 0 -> 1 -> 0
      const curve = Math.sin(progress * Math.PI);

      headNode.rotation.z = targetRoll * curve;
      headNode.rotation.x = targetPitch * curve;
      headNode.rotation.y = targetYaw * curve;

      if (neckNode) {
        neckNode.rotation.z = (targetRoll * 0.4) * curve;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        headNode.rotation.set(0, 0, 0);
        if (neckNode) neckNode.rotation.set(0, 0, 0);
        if (expr) {
          expr.setValue('relaxed', 0);
          expr.setValue('happy', 0);
        }
        onComplete();
      }
    };

    this.activeIdleCancelFn = () => {
      isCancelled = true;
      headNode.rotation.set(0, 0, 0);
      if (neckNode) neckNode.rotation.set(0, 0, 0);
      if (expr) {
        expr.setValue('relaxed', 0);
        expr.setValue('happy', 0);
      }
    };

    requestAnimationFrame(animate);
  }

  private performBlinkFlutterAnimation(onComplete: () => void) {
    const expr = this.vrm?.expressionManager;
    if (!expr) {
      onComplete();
      return;
    }

    let isCancelled = false;
    const duration = 800; // ms
    const startTime = performance.now();

    const animate = () => {
      if (isCancelled || this.isDisposed) return;
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Double blink wave: two quick peaks
      let blinkVal = 0;
      if (progress < 0.4) {
        blinkVal = Math.sin((progress / 0.4) * Math.PI);
      } else if (progress > 0.5 && progress < 0.9) {
        blinkVal = Math.sin(((progress - 0.5) / 0.4) * Math.PI);
      }

      expr.setValue('blink', blinkVal);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        expr.setValue('blink', 0);
        onComplete();
      }
    };

    this.activeIdleCancelFn = () => {
      isCancelled = true;
      expr.setValue('blink', 0);
    };

    requestAnimationFrame(animate);
  }

  private performLookAroundAnimation(onComplete: () => void) {
    const headNode = this.vrm?.humanoid?.getNormalizedBoneNode('head');
    const neckNode = this.vrm?.humanoid?.getNormalizedBoneNode('neck');

    if (!headNode) {
      const win = window as any;
      if (typeof win.playGesture === 'function') {
        win.playGesture('think');
      }
      setTimeout(onComplete, 2000);
      return;
    }

    let isCancelled = false;
    const duration = 2800; // ms
    const startTime = performance.now();

    const lookDirection = Math.random() > 0.5 ? 1 : -1;
    const maxYaw = lookDirection * 0.22;
    const maxPitch = 0.08;

    const animate = () => {
      if (isCancelled || this.isDisposed) return;
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      // S-curve cycle looking one direction then turning slightly across before center
      let yaw = 0;
      if (progress < 0.5) {
        yaw = maxYaw * Math.sin((progress / 0.5) * Math.PI);
      } else {
        yaw = (-maxYaw * 0.5) * Math.sin(((progress - 0.5) / 0.5) * Math.PI);
      }
      const pitch = maxPitch * Math.sin(progress * Math.PI);

      headNode.rotation.y = yaw;
      headNode.rotation.x = pitch;
      if (neckNode) {
        neckNode.rotation.y = yaw * 0.35;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        headNode.rotation.set(0, 0, 0);
        if (neckNode) neckNode.rotation.set(0, 0, 0);
        onComplete();
      }
    };

    this.activeIdleCancelFn = () => {
      isCancelled = true;
      headNode.rotation.set(0, 0, 0);
      if (neckNode) neckNode.rotation.set(0, 0, 0);
    };

    requestAnimationFrame(animate);
  }

  private performShySmileAnimation(onComplete: () => void) {
    const expr = this.vrm?.expressionManager;
    const headNode = this.vrm?.humanoid?.getNormalizedBoneNode('head');

    let isCancelled = false;
    const duration = 2200;
    const startTime = performance.now();

    const animate = () => {
      if (isCancelled || this.isDisposed) return;
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      const curve = Math.sin(progress * Math.PI);

      if (expr) {
        expr.setValue('happy', curve * 0.7);
        expr.setValue('blush', curve * 0.8);
      }

      if (headNode) {
        headNode.rotation.z = curve * 0.09;
        headNode.rotation.x = curve * -0.05; // slight shy look down
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        if (expr) {
          expr.setValue('happy', 0);
          expr.setValue('blush', 0);
        }
        if (headNode) headNode.rotation.set(0, 0, 0);
        onComplete();
      }
    };

    this.activeIdleCancelFn = () => {
      isCancelled = true;
      if (expr) {
        expr.setValue('happy', 0);
        expr.setValue('blush', 0);
      }
      if (headNode) headNode.rotation.set(0, 0, 0);
    };

    requestAnimationFrame(animate);
  }

  private performCuriousNodAnimation(onComplete: () => void) {
    const headNode = this.vrm?.humanoid?.getNormalizedBoneNode('head');
    const expr = this.vrm?.expressionManager;

    if (!headNode) {
      onComplete();
      return;
    }

    let isCancelled = false;
    const duration = 1800;
    const startTime = performance.now();

    const animate = () => {
      if (isCancelled || this.isDisposed) return;
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Two pleasant nods
      const nodCurve = Math.sin(progress * Math.PI * 2) * (1 - progress * 0.3);
      headNode.rotation.x = Math.max(0, nodCurve * 0.12);

      if (expr) {
        expr.setValue('relaxed', Math.sin(progress * Math.PI) * 0.5);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        headNode.rotation.set(0, 0, 0);
        if (expr) expr.setValue('relaxed', 0);
        onComplete();
      }
    };

    this.activeIdleCancelFn = () => {
      isCancelled = true;
      headNode.rotation.set(0, 0, 0);
      if (expr) expr.setValue('relaxed', 0);
    };

    requestAnimationFrame(animate);
  }

  private performSighAnimation(onComplete: () => void) {
    const expr = this.vrm?.expressionManager;
    const spineNode = this.vrm?.humanoid?.getNormalizedBoneNode('spine');
    const headNode = this.vrm?.humanoid?.getNormalizedBoneNode('head');

    let isCancelled = false;
    const duration = 2400;
    const startTime = performance.now();

    const animate = () => {
      if (isCancelled || this.isDisposed) return;
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      const curve = Math.sin(progress * Math.PI);

      if (expr) {
        expr.setValue('relaxed', curve * 0.6);
      }

      if (spineNode) {
        spineNode.rotation.x = curve * 0.04;
      }
      if (headNode) {
        headNode.rotation.x = curve * 0.05;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        if (expr) expr.setValue('relaxed', 0);
        if (spineNode) spineNode.rotation.set(0, 0, 0);
        if (headNode) headNode.rotation.set(0, 0, 0);
        onComplete();
      }
    };

    this.activeIdleCancelFn = () => {
      isCancelled = true;
      if (expr) expr.setValue('relaxed', 0);
      if (spineNode) spineNode.rotation.set(0, 0, 0);
      if (headNode) headNode.rotation.set(0, 0, 0);
    };

    requestAnimationFrame(animate);
  }

  private executeGesture(gesture: GestureType, hitPoint?: THREE.Vector3) {
    console.log(`[InteractionManager] Avatar clicked! Triggering response: "${gesture}"`);

    // 1. Custom callback
    if (this.onInteract) {
      this.onInteract(gesture, hitPoint);
    }

    // 2. Global gesture player if available
    const win = window as any;
    if (gesture === 'lookAround') {
      if (typeof win.playGesture === 'function') {
        win.playGesture('think');
      }
    } else if (typeof win.playGesture === 'function') {
      win.playGesture(gesture);
    }

    // 3. Dispatch window events for subtitle/audio/companion reactions
    window.dispatchEvent(
      new CustomEvent('lyraInteract', {
        detail: {
          gesture,
          hitPoint: hitPoint ? { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z } : undefined,
          timestamp: Date.now(),
        },
      })
    );

    // 4. Trigger subtle facial expression reaction if VRM is available
    if (this.vrm?.expressionManager) {
      const expr = this.vrm.expressionManager;
      const initialHappy = expr.getValue('happy') || 0;
      
      // Momentary pleasant smile reaction
      expr.setValue('happy', Math.min(1, initialHappy + 0.5));
      setTimeout(() => {
        expr.setValue('happy', initialHappy);
      }, 1400);
    }
  }

  public dispose() {
    this.isDisposed = true;
    if (this.idleCheckInterval !== null) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }
    if (this.activeIdleCancelFn) {
      this.activeIdleCancelFn();
      this.activeIdleCancelFn = null;
    }
    this.unbindEvents();
    if (this.domElement && this.isHovered) {
      this.domElement.style.cursor = '';
    }
    this.targetObject = null;
    this.vrm = null;
  }
}

