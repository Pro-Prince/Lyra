import { useEffect, useRef, useState, Suspense, memo, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../hooks/useToast';
import { useCompanionMovement } from '../hooks/useCompanionMovement';
import { RoomEnvironment } from './RoomEnvironment';
import { applyRestPose } from '../lib/poseUtils';
import { getCachedOutfit, preloadAllOutfits } from '../lib/outfitCache';
import { loadCompanionModel } from '../lib/companionRenderer';
import { vrmAudioSync } from '../lib/vrmAudioSync';
import { InteractionManager } from './InteractionManager';

const SCRATCH_COLOR_A = new THREE.Color();
const SCRATCH_COLOR_B = new THREE.Color();
const SCRATCH_COLOR_C = new THREE.Color();
const VISEMES = ['aa', 'ih', 'ou', 'ee', 'oh'] as const;

function resolveHexColor(colorStr?: string, fallback = "#FF8FC0"): string {
  if (!colorStr) return fallback;
  if (colorStr.startsWith("var(")) {
    if (typeof window !== "undefined") {
      const varName = colorStr.replace(/^var\((--[^,\s)]+).*\)$/, "$1").trim();
      const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      if (computed && (computed.startsWith("#") || computed.startsWith("rgb") || computed.startsWith("hsl"))) {
        return computed;
      }
    }
    return fallback;
  }
  return colorStr;
}

interface EmotionExpressionMap {
  happy: number;
  relaxed: number;
  surprised: number;
  neutral: number;
  sad: number;
}

const EMOTION_EXPRESSIONS: Record<string, EmotionExpressionMap> = {
  warm: { happy: 0.35, relaxed: 0.45, surprised: 0.0, neutral: 0.2, sad: 0.0 },
  playful: { happy: 0.75, relaxed: 0.1, surprised: 0.25, neutral: 0.0, sad: 0.0 },
  thoughtful: { happy: 0.05, relaxed: 0.25, surprised: 0.05, neutral: 0.65, sad: 0.0 },
  excited: { happy: 0.9, relaxed: 0.0, surprised: 0.45, neutral: 0.0, sad: 0.0 },
  calm: { happy: 0.2, relaxed: 0.75, surprised: 0.0, neutral: 0.3, sad: 0.0 },
  affectionate: { happy: 0.8, relaxed: 0.2, surprised: 0.0, neutral: 0.0, sad: 0.0 },
  shy: { happy: 0.2, relaxed: 0.0, surprised: 0.1, neutral: 0.4, sad: 0.0 }
};

function createGestureClips(vrm: VRM): Record<string, THREE.AnimationClip> {
  const h = vrm.humanoid;
  if (!h) return {};

  const head = h.getNormalizedBoneNode('head');
  const neck = h.getNormalizedBoneNode('neck');
  const spine = h.getNormalizedBoneNode('spine');
  const chest = h.getNormalizedBoneNode('chest');
  const upperArmR = h.getNormalizedBoneNode('rightUpperArm');
  const lowerArmR = h.getNormalizedBoneNode('rightLowerArm');
  const handR = h.getNormalizedBoneNode('rightHand');
  const upperArmL = h.getNormalizedBoneNode('leftUpperArm');
  const lowerArmL = h.getNormalizedBoneNode('leftLowerArm');
  const handL = h.getNormalizedBoneNode('leftHand');

  const makeTrack = (node: THREE.Object3D | null, eulers: THREE.Euler[], times: number[]) => {
    if (!node) return null;
    const values = eulers.flatMap(e => new THREE.Quaternion().setFromEuler(e).toArray());
    return new THREE.QuaternionKeyframeTrack(`${node.name}.quaternion`, times, values);
  };

  const qZero = new THREE.Euler(0, 0, 0);
  const gestureClips: Record<string, THREE.AnimationClip> = {};

  // 1. WAVE (2.0s)
  const waveTracks: (THREE.QuaternionKeyframeTrack | null)[] = [
    makeTrack(upperArmR, [
      qZero,
      new THREE.Euler(0, 0, -Math.PI / 2.2),
      new THREE.Euler(0, 0, -Math.PI / 2.2),
      qZero
    ], [0, 0.3, 1.7, 2.0]),
    makeTrack(lowerArmR, [
      qZero,
      qZero,
      new THREE.Euler(0, 0, -0.5),
      new THREE.Euler(0, 0, 0.5),
      new THREE.Euler(0, 0, -0.5),
      new THREE.Euler(0, 0, 0.5),
      new THREE.Euler(0, 0, 0),
      qZero
    ], [0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.7, 2.0]),
    makeTrack(handR, [
      qZero,
      qZero,
      new THREE.Euler(0, 0, -0.2),
      new THREE.Euler(0, 0, 0.2),
      new THREE.Euler(0, 0, -0.2),
      new THREE.Euler(0, 0, 0.2),
      qZero
    ], [0, 0.3, 0.6, 0.9, 1.2, 1.5, 2.0]),
    makeTrack(head, [
      qZero,
      new THREE.Euler(0, -0.08, -0.05),
      new THREE.Euler(0, -0.08, -0.05),
      qZero
    ], [0, 0.3, 1.7, 2.0])
  ];
  const validWave = waveTracks.filter((t): t is THREE.QuaternionKeyframeTrack => t !== null);
  if (validWave.length > 0) gestureClips['wave'] = new THREE.AnimationClip('wave', 2.0, validWave);

  // 2. NOD (0.9s)
  const nodTracks: (THREE.QuaternionKeyframeTrack | null)[] = [
    makeTrack(head, [
      qZero,
      new THREE.Euler(0.22, 0, 0),
      new THREE.Euler(-0.06, 0, 0),
      new THREE.Euler(0.14, 0, 0),
      qZero
    ], [0, 0.25, 0.45, 0.68, 0.9]),
    makeTrack(neck, [
      qZero,
      new THREE.Euler(0.08, 0, 0),
      new THREE.Euler(-0.02, 0, 0),
      new THREE.Euler(0.05, 0, 0),
      qZero
    ], [0, 0.25, 0.45, 0.68, 0.9])
  ];
  const validNod = nodTracks.filter((t): t is THREE.QuaternionKeyframeTrack => t !== null);
  if (validNod.length > 0) gestureClips['nod'] = new THREE.AnimationClip('nod', 0.9, validNod);

  // 3. LAUGH (1.5s)
  const laughTracks: (THREE.QuaternionKeyframeTrack | null)[] = [
    makeTrack(head, [
      qZero,
      new THREE.Euler(-0.16, 0.06, 0.05),
      new THREE.Euler(0.04, -0.02, 0),
      new THREE.Euler(-0.12, 0.04, 0.03),
      new THREE.Euler(0.02, 0, 0),
      qZero
    ], [0, 0.3, 0.6, 0.9, 1.2, 1.5]),
    makeTrack(chest, [
      qZero,
      new THREE.Euler(0.05, 0, 0),
      new THREE.Euler(-0.02, 0, 0),
      new THREE.Euler(0.04, 0, 0),
      new THREE.Euler(-0.01, 0, 0),
      qZero
    ], [0, 0.3, 0.6, 0.9, 1.2, 1.5]),
    makeTrack(spine, [
      qZero,
      new THREE.Euler(-0.04, 0.02, 0.02),
      new THREE.Euler(0.01, 0, 0),
      new THREE.Euler(-0.03, 0.01, 0.01),
      qZero
    ], [0, 0.3, 0.6, 0.9, 1.5])
  ];
  const validLaugh = laughTracks.filter((t): t is THREE.QuaternionKeyframeTrack => t !== null);
  if (validLaugh.length > 0) gestureClips['laugh'] = new THREE.AnimationClip('laugh', 1.5, validLaugh);

  // 4. THINK (1.8s)
  const thinkTracks: (THREE.QuaternionKeyframeTrack | null)[] = [
    makeTrack(head, [
      qZero,
      new THREE.Euler(0.12, -0.22, 0.14),
      new THREE.Euler(0.12, -0.22, 0.14),
      qZero
    ], [0, 0.4, 1.4, 1.8]),
    makeTrack(upperArmR, [
      qZero,
      new THREE.Euler(0.35, 0.15, -0.4),
      new THREE.Euler(0.35, 0.15, -0.4),
      qZero
    ], [0, 0.4, 1.4, 1.8]),
    makeTrack(lowerArmR, [
      qZero,
      new THREE.Euler(0.6, 0.1, 0.3),
      new THREE.Euler(0.6, 0.1, 0.3),
      qZero
    ], [0, 0.4, 1.4, 1.8])
  ];
  const validThink = thinkTracks.filter((t): t is THREE.QuaternionKeyframeTrack => t !== null);
  if (validThink.length > 0) gestureClips['think'] = new THREE.AnimationClip('think', 1.8, validThink);

  // 5. CHEER (1.8s)
  const cheerTracks: (THREE.QuaternionKeyframeTrack | null)[] = [
    makeTrack(upperArmL, [
      qZero,
      new THREE.Euler(0.3, 0, 1.5),
      new THREE.Euler(0.3, 0, 1.6),
      new THREE.Euler(0.3, 0, 1.5),
      qZero
    ], [0, 0.4, 0.8, 1.2, 1.8]),
    makeTrack(upperArmR, [
      qZero,
      new THREE.Euler(0.3, 0, -1.5),
      new THREE.Euler(0.3, 0, -1.6),
      new THREE.Euler(0.3, 0, -1.5),
      qZero
    ], [0, 0.4, 0.8, 1.2, 1.8]),
    makeTrack(lowerArmL, [
      qZero,
      new THREE.Euler(0.6, 0, 0.4),
      new THREE.Euler(0.7, 0, 0.5),
      new THREE.Euler(0.6, 0, 0.4),
      qZero
    ], [0, 0.4, 0.8, 1.2, 1.8]),
    makeTrack(lowerArmR, [
      qZero,
      new THREE.Euler(0.6, 0, -0.4),
      new THREE.Euler(0.7, 0, -0.5),
      new THREE.Euler(0.6, 0, -0.4),
      qZero
    ], [0, 0.4, 0.8, 1.2, 1.8]),
    makeTrack(chest, [
      qZero,
      new THREE.Euler(-0.08, 0, 0),
      new THREE.Euler(-0.1, 0, 0),
      new THREE.Euler(-0.08, 0, 0),
      qZero
    ], [0, 0.4, 0.8, 1.2, 1.8]),
    makeTrack(head, [
      qZero,
      new THREE.Euler(-0.18, 0, 0),
      new THREE.Euler(-0.2, 0, 0),
      new THREE.Euler(-0.18, 0, 0),
      qZero
    ], [0, 0.4, 0.8, 1.2, 1.8])
  ];
  const validCheer = cheerTracks.filter((t): t is THREE.QuaternionKeyframeTrack => t !== null);
  if (validCheer.length > 0) gestureClips['cheer'] = new THREE.AnimationClip('cheer', 1.8, validCheer);

  return gestureClips;
}

interface CameraRigProps {
  mode: 'centered' | 'panned-left' | 'room-wide' | 'portrait';
  vrmScene?: THREE.Group | null;
}

function CameraRig({ mode, vrmScene }: CameraRigProps) {
  const { camera, gl } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3());
  const portraitFraming = useRef({ midY: 1.35, distance: 1.2 });

  // Compute portrait camera framing ONCE per VRM load and on resize - NEVER inside useFrame!
  const updateFraming = () => {
    if (!vrmScene) return;
    vrmScene.traverse((child) => { if (!child.parent) child.parent = null; });
    vrmScene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(vrmScene);
    const headTop = box.max.y;
    const shoulderY = headTop - (box.max.y - box.min.y) * 0.25;
    const targetHeight = Math.max(0.2, headTop - shoulderY);
    const paddingFactor = 1.4; // real headroom above her head so ears/head are never cropped
    const perspCam = camera as THREE.PerspectiveCamera;
    const fov = perspCam.fov * (Math.PI / 180);
    let distance = (targetHeight * paddingFactor) / (2 * Math.tan(fov / 2));
    
    // If screen is narrow (mobile), we need to pull back to not crop horizontally
    if (perspCam.aspect < 1.0) {
       distance = distance / perspCam.aspect;
    }
    
    const midY = (headTop + shoulderY) / 2;
    portraitFraming.current = { midY, distance };
  };

  useEffect(() => {
    updateFraming();
  }, [vrmScene, camera]);

  useEffect(() => {
    const canvasContainer = gl.domElement.parentElement;
    if (!canvasContainer) return;

    const updateCamera = () => {
      const width = canvasContainer.clientWidth;
      const height = canvasContainer.clientHeight;
      if (width > 0 && height > 0) {
        const perspCam = camera as THREE.PerspectiveCamera;
        perspCam.aspect = width / height;
        perspCam.updateProjectionMatrix();
        gl.setSize(width, height, false);
        updateFraming();
      }
    };

    const ro = new ResizeObserver(() => {
      updateCamera();
    });
    ro.observe(canvasContainer);
    updateCamera();

    return () => ro.disconnect();
  }, [camera, gl, vrmScene]);

  useFrame(() => {
    const companionPosition = vrmScene ? vrmScene.position : new THREE.Vector3();

    if (vrmScene && mode === 'portrait') {
      const { midY, distance } = portraitFraming.current;
      targetPos.current.set(companionPosition.x, Math.max(0.6, midY), companionPosition.z + distance);
      lookTarget.current.set(companionPosition.x, midY, companionPosition.z);
    } else if (mode === 'room-wide') {
      targetPos.current.set(companionPosition.x, Math.max(0.8, 1.6), companionPosition.z + 3.2);
      lookTarget.current.set(companionPosition.x, 1.2, companionPosition.z);
    } else if (mode === 'panned-left') {
      targetPos.current.set(-0.9, Math.max(0.8, 1.3), 2.4);
      lookTarget.current.set(-0.4, 1.3, 0);
    } else {
      targetPos.current.set(0, Math.max(0.8, 1.3), 2.0);
      lookTarget.current.set(0, 1.3, 0);
    }

    // Clamp camera Y so it never drops below floor level (floor is y=0)
    targetPos.current.y = Math.max(0.6, targetPos.current.y);

    camera.position.lerp(targetPos.current, 0.05);
    camera.lookAt(lookTarget.current);
  });
  return null;
}

// removed StandingSurface, Starfield, AnimatedLighting

interface VRMModelProps {
  url: string;
  emotion?: string;
  isProcessing?: boolean;
  onProgress?: (percent: number) => void;
  onLoaded?: (scene: THREE.Group) => void;
  onError?: (error: string) => void;
  retryKey?: number;
}

function VRMModel({ url, emotion = 'warm', isProcessing = false, onProgress, onLoaded, onError, retryKey = 0 }: VRMModelProps) {
  const { camera, gl } = useThree();
  const [vrm, setVrm] = useState<VRM | null>(null);

  const lookTarget = useRef(new THREE.Object3D());
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const clips = useRef<Record<string, THREE.AnimationClip>>({});
  const currentAction = useRef<THREE.AnimationAction | null>(null);
  const targetLookAt = useRef(new THREE.Vector3(0, 1.35, 3));

  useEffect(() => {
    let isCancelled = false;

    const setupVRM = async () => {
      try {
        if (onProgress) onProgress(20);
        const vrmInstance = await loadCompanionModel(url);

        if (isCancelled || !vrmInstance) {
          if (!vrmInstance && onError) onError(`Failed to resolve outfit for ${url}`);
          return;
        }

        const cached = getCachedOutfit(url);

        // Apply rest pose
        applyRestPose(vrmInstance);

        // Detailed Diagnostics for Checks 1, 2, 3
        console.log('[VRM Diagnostic] Model loaded:', url);
        console.log('[VRM Diagnostic] Position before centering:', vrmInstance.scene.position.clone());
        console.log('[VRM Diagnostic] Scale:', vrmInstance.scene.scale.clone());
        console.log('[VRM Diagnostic] Initial Bounding Box:', new THREE.Box3().setFromObject(vrmInstance.scene));

        // Center & floor VRM
        vrmInstance.scene.traverse((child) => { if (!child.parent) child.parent = null; });
        vrmInstance.scene.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(vrmInstance.scene);
        const center = new THREE.Vector3();
        box.getCenter(center);
        vrmInstance.scene.position.x -= center.x;
        vrmInstance.scene.position.z -= center.z;
        vrmInstance.scene.position.y -= box.min.y;

        console.log('[VRM Diagnostic] Position after centering/grounding:', vrmInstance.scene.position.clone());
        console.log('[VRM Diagnostic] Bounding Box after grounding:', new THREE.Box3().setFromObject(vrmInstance.scene));

        // Check materials & textures
        vrmInstance.scene.traverse((obj: any) => {
          if (obj.isMesh) {
            console.log(
              `[VRM Mesh] ${obj.name || 'unnamed'} | material: ${obj.material?.type} | visible: ${obj.visible} | map: ${!!(obj.material?.map || obj.material?.userData?.vrmMToonTexture)}`
            );
          }
        });

        // Setup LookAt target
        lookTarget.current.position.set(0, 1.35, 3);
        vrmInstance.scene.add(lookTarget.current);
        if (vrmInstance.lookAt) {
          vrmInstance.lookAt.target = lookTarget.current;
        }

        mixer.current = new THREE.AnimationMixer(vrmInstance.scene);

        // Integrate generated tap gesture clips with loaded Mixamo clips
        const proceduralGestures = createGestureClips(vrmInstance);
        clips.current = {
          ...proceduralGestures,
          ...(cached.clips || {})
        };

        const playGesture = (name: string) => {
          if (!mixer.current || !clips.current[name]) return;
          const clip = clips.current[name];
          const action = mixer.current.clipAction(clip);
          if (currentAction.current && currentAction.current !== action) {
            currentAction.current.crossFadeTo(action, 0.25, false);
          }
          action.reset();
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
          action.play();
          currentAction.current = action;

          const onFinished = (e: any) => {
            if (e.action === action) {
              action.fadeOut(0.3);
              mixer.current?.removeEventListener('finished', onFinished);
              if (currentAction.current === action) {
                 if (clips.current['idle']) {
                   crossfadeToAction('idle', 0.4, true);
                 } else {
                   currentAction.current = null;
                 }
              }
            }
          };
          mixer.current.addEventListener('finished', onFinished);
        };

        const playAction = (name: string, loop = true) => {
          if (!mixer.current || !clips.current[name]) return;
          const clip = clips.current[name];
          const action = mixer.current.clipAction(clip);
          action.reset();
          action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
          action.clampWhenFinished = !loop;
          action.play();
          currentAction.current = action;
        };

        const crossfadeToAction = (name: string, duration = 0.5, loop = true) => {
          if (!mixer.current || !clips.current[name]) return;
          const clip = clips.current[name];
          const nextAction = mixer.current.clipAction(clip);
          nextAction.reset();
          nextAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
          nextAction.clampWhenFinished = !loop;
          nextAction.play();
          
          if (currentAction.current && currentAction.current !== nextAction) {
            currentAction.current.crossFadeTo(nextAction, duration, false);
          }
          
          currentAction.current = nextAction;

          if (!loop) {
            const onFinished = (e: any) => {
              if (e.action === nextAction) {
                nextAction.fadeOut(0.3);
                mixer.current?.removeEventListener('finished', onFinished);
                if (currentAction.current === nextAction) {
                   crossfadeToAction('idle', 0.4, true);
                   window.dispatchEvent(new CustomEvent('lyraAction', { detail: 'idle' }));
                }
              }
            };
            mixer.current.addEventListener('finished', onFinished);
          }
        };

        // @ts-ignore
        window.playGesture = playGesture;
        // @ts-ignore
        window.playAction = playAction;
        // @ts-ignore
        window.crossfadeToAction = crossfadeToAction;

        if (clips.current['idle']) {
          playAction('idle', true);
        }

        if (onProgress) onProgress(100);
        if (onLoaded) onLoaded(vrmInstance.scene);

        setVrm(vrmInstance);
      } catch (err: any) {
        if (isCancelled) return;
        if (onError) onError(err?.message || String(err));
      }
    };

    setupVRM();

    return () => {
      isCancelled = true;
      if (mixer.current) {
        mixer.current.stopAllAction();
      }
    };
  }, [url, retryKey]);

  const blinkState = useRef({
    nextBlinkTime: 2 + Math.random() * 4,
    isBlinking: false,
    blinkStartTime: 0,
    blinkDuration: 0.12,
  });

  const currentViseme = useRef<string>('neutral');
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    analyserRef.current = vrmAudioSync.getAnalyser();
    const handleSpeak = (e: any) => { currentViseme.current = e.detail; };
    window.addEventListener('lyraSpeak', handleSpeak);
    return () => window.removeEventListener('lyraSpeak', handleSpeak);
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const normX = Math.max(-0.4, Math.min(0.4, (e.clientX / window.innerWidth) * 2 - 1));
      const normY = Math.max(-0.3, Math.min(0.3, -(e.clientY / window.innerHeight) * 2 + 1));
      targetLookAt.current.set(normX * 1.2, 1.35 + normY * 0.7, 3);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const normX = Math.max(-0.4, Math.min(0.4, (touch.clientX / window.innerWidth) * 2 - 1));
        const normY = Math.max(-0.3, Math.min(0.3, -(touch.clientY / window.innerHeight) * 2 + 1));
        targetLookAt.current.set(normX * 1.2, 1.35 + normY * 0.7, 3);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  useEffect(() => {
    if (!vrm || !gl.domElement || !camera) return;

    let lookAtTimer: NodeJS.Timeout | number | null = null;

    const interactionMgr = new InteractionManager({
      camera,
      domElement: gl.domElement,
      targetObject: vrm.scene,
      vrm,
      onInteract: (_gesture, hitPoint) => {
        if (hitPoint) {
          targetLookAt.current.set(hitPoint.x * 1.1, Math.max(1.1, hitPoint.y), 2.5);
          if (lookAtTimer) clearTimeout(lookAtTimer);
          lookAtTimer = setTimeout(() => {
            targetLookAt.current.set(0, 1.35, 3);
          }, 1600);
        }
      },
    });

    return () => {
      if (lookAtTimer) clearTimeout(lookAtTimer);
      interactionMgr.dispose();
    };
  }, [vrm, camera, gl.domElement]);

  const movement = useCompanionMovement(vrm?.scene || null);
  const elapsedTimeRef = useRef(0);

  useFrame((_, delta) => {
    if (vrm) {
      const safeDelta = Math.min(delta, 0.04);
      elapsedTimeRef.current += safeDelta;
      const time = elapsedTimeRef.current;

      movement.update(safeDelta);

      // Gaze tracking damping (drives lookAt target for eyes, does not touch body bones)
      let targetGaze = targetLookAt.current.clone();
      if (isProcessing) {
         targetGaze.set(0, 1.15, 2.8);
      }
      lookTarget.current.position.lerp(targetGaze, 0.08);

      // Blink oscillator (expression blendshape)
      const state = blinkState.current;
      if (time > state.nextBlinkTime && !state.isBlinking) {
        state.isBlinking = true;
        state.blinkStartTime = time;
      }

      if (state.isBlinking) {
        const blinkProgress = (time - state.blinkStartTime) / state.blinkDuration;
        let blinkValue = 0;
        if (blinkProgress >= 1) {
          state.isBlinking = false;
          state.nextBlinkTime = time + 2 + Math.random() * 4;
        } else {
          blinkValue = Math.sin(blinkProgress * Math.PI);
        }
        if (vrm.expressionManager) {
          vrm.expressionManager.setValue('blink', blinkValue);
        }
      }

      // Emotion & Lip Sync (expression blendshapes)
      if (vrm.expressionManager) {
        const targetExpr = EMOTION_EXPRESSIONS[emotion] || EMOTION_EXPRESSIONS.warm;
        const happyVal = vrm.expressionManager.getValue('happy') || 0;
        const relaxedVal = vrm.expressionManager.getValue('relaxed') || 0;
        const surprisedVal = vrm.expressionManager.getValue('surprised') || 0;

        vrm.expressionManager.setValue('happy', THREE.MathUtils.lerp(happyVal, targetExpr.happy, safeDelta * 3));
        vrm.expressionManager.setValue('relaxed', THREE.MathUtils.lerp(relaxedVal, targetExpr.relaxed, safeDelta * 3));
        vrm.expressionManager.setValue('surprised', THREE.MathUtils.lerp(surprisedVal, targetExpr.surprised, safeDelta * 3));

        const isBlush = emotion === 'affectionate' || emotion === 'shy';
        const currentBlush = vrm.expressionManager.getValue('blush') || 0;
        const targetBlush = isBlush ? 1.0 : 0.0;
        if (Math.abs(currentBlush - targetBlush) > 0.01) {
            vrm.expressionManager.setValue('blush', THREE.MathUtils.lerp(currentBlush, targetBlush, safeDelta * 3));
        }

        // Real-time Web Audio API frequency analysis
        const analyser = analyserRef.current;
        let visemeWeights = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
        let hasAudio = false;

        if (analyser) {
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyser.getByteFrequencyData(dataArray);

          // Calculate average amplitude across the entire spectrum
          let totalAmp = 0;
          for (let i = 0; i < bufferLength; i++) {
            totalAmp += dataArray[i];
          }
          const averageAmp = totalAmp / bufferLength;
          // Normalize the amplitude based on expected maximum levels (usually peaks around 120-140)
          const normalizedAmp = Math.min(1.0, averageAmp / 110);

          if (normalizedAmp > 0.01) {
            hasAudio = true;
            let lowSum = 0;
            let midSum = 0;
            let highSum = 0;

            const lowEnd = Math.floor(bufferLength * 0.15);
            const midEnd = Math.floor(bufferLength * 0.45);

            for (let i = 0; i < bufferLength; i++) {
              if (i < lowEnd) {
                lowSum += dataArray[i];
              } else if (i < midEnd) {
                midSum += dataArray[i];
              } else {
                highSum += dataArray[i];
              }
            }

            const lowAvg = lowSum / lowEnd || 0;
            const midAvg = midSum / (midEnd - lowEnd) || 0;
            const highAvg = highSum / (bufferLength - midEnd) || 0;

            const totalAvg = lowAvg + midAvg + highAvg || 1;

            // Classify FFT spectrum content to map to human-like vowels
            visemeWeights.aa = Math.max(0, (lowAvg * 1.5) / totalAvg);
            visemeWeights.oh = Math.max(0, (midAvg * 1.2) / totalAvg);
            visemeWeights.ee = Math.max(0, (highAvg * 1.6) / totalAvg);
            visemeWeights.ih = Math.max(0, (midAvg * 0.8 + highAvg * 0.8) / totalAvg);
            visemeWeights.ou = Math.max(0, (lowAvg * 0.8 + midAvg * 0.4) / totalAvg);

            // Scale all weights relative to the measured audio volume envelope
            const sumWeights = visemeWeights.aa + visemeWeights.ih + visemeWeights.ou + visemeWeights.ee + visemeWeights.oh || 1;
            visemeWeights.aa = (visemeWeights.aa / sumWeights) * normalizedAmp;
            visemeWeights.ih = (visemeWeights.ih / sumWeights) * normalizedAmp;
            visemeWeights.ou = (visemeWeights.ou / sumWeights) * normalizedAmp;
            visemeWeights.ee = (visemeWeights.ee / sumWeights) * normalizedAmp;
            visemeWeights.oh = (visemeWeights.oh / sumWeights) * normalizedAmp;
          }
        }

        // Apply weights smoothly to VRM expression blendshapes
        for (let i = 0; i < VISEMES.length; i++) {
          const v = VISEMES[i];
          const currentWeight = vrm.expressionManager.getValue(v) || 0;
          // Fall back gracefully to standard timed visemes if user has not interacted with page to resume audio ctx yet
          const targetWeight = hasAudio 
            ? (visemeWeights[v] || 0) 
            : (currentViseme.current === v ? 1.0 : 0.0);

          if (Math.abs(currentWeight - targetWeight) > 0.01) {
            vrm.expressionManager.setValue(v, THREE.MathUtils.lerp(currentWeight, targetWeight, safeDelta * 18));
          }
        }
      }

      // Exactly ONE authority drives skeletal body pose: AnimationMixer
      if (mixer.current) {
        mixer.current.update(safeDelta);
      }

      vrm.update(safeDelta);
    }
  });

  if (!vrm) return null;

  return <primitive object={vrm.scene} position={[0, 0, 0]} />;
}

function CompanionStageComponent({
  modelId,
  isWardrobeOpen = false,
  accentColor = "#FF8FC0",
  scenery = 'neutral',
  outfitUrl = '/models/lyra.vrm',
  emotion = 'warm',
  graphicsTier = 'high',
  isPortraitMode = false,
  isProcessing = false,
  silentError = false,
  transparentBg = false,
  className = '',
  mode,
  onModelLoaded,
  onError
}: {
  modelId?: string;
  className?: string;
  mode?: 'full-body' | 'portrait' | 'room-wide' | 'panned-left';
  accentColor?: string;
  isCallMode?: boolean;
  scenery?: string;
  outfitUrl?: string;
  emotion?: string;
  isWardrobeOpen?: boolean;
  graphicsTier?: 'low' | 'medium' | 'high';
  isPortraitMode?: boolean;
  isProcessing?: boolean;
  silentError?: boolean;
  transparentBg?: boolean;
  onModelLoaded?: () => void;
  onError?: (err?: string) => void;
}) {
  const activeModelId = modelId || outfitUrl || '/models/lyra.vrm';
  const effectivePortraitMode = isPortraitMode || mode === 'portrait';
  const effectiveWardrobeOpen = isWardrobeOpen || mode === 'panned-left';
  const { showInfo } = useToast();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [vrmSceneRef, setVrmSceneRef] = useState<THREE.Group | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const retryCount = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);
  const [isTabVisible, setIsTabVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState !== 'hidden');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleRetry = () => {
    setIsLoaded(false);
    setHasFailed(false);
    setVrmSceneRef(null);
    setRetryKey(prev => prev + 1);
  };

  const handleError = (err?: string) => {
    setIsLoaded(false);
    if (retryCount.current === 0) {
      retryCount.current++;
      console.warn('Companion load failed, retrying once quietly:', err);
      // Wait a moment then retry quietly
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(() => {
        handleRetry();
      }, 1000);
      return;
    }
    
    console.error('Companion load failed after retry:', err);
    setHasFailed(true);
    if (onError) {
      onError(err);
    }
    if (!silentError) {
      showInfo("One moment, she's settling back in.", {
        label: "Retry",
        onClick: () => {
          retryCount.current = 0;
          handleRetry();
        }
      });
    }
  };

  useEffect(() => {
    setIsLoaded(false);
    setHasFailed(false);
    setVrmSceneRef(null);
  }, [activeModelId]);

  const showOpaqueBg = !transparentBg && !effectivePortraitMode;

  if (hasFailed && silentError) {
    return null;
  }

  return (
    <div className={`w-full h-full relative overflow-hidden flex items-center justify-center select-none ${showOpaqueBg ? 'bg-[var(--bg-base)]' : 'bg-transparent'} ${className}`}>
      {showOpaqueBg && <div className="absolute inset-0 transition-colors duration-1000 bg-[var(--bg-base)]" />}
      
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="absolute bottom-32 w-16 h-16 rounded-full border-[3px] border-[var(--accent-primary)] z-20 pointer-events-none"
            style={{ 
              boxShadow: '0 0 20px var(--accent-primary), inset 0 0 20px var(--accent-primary)'
            }}
          >
            <motion.div 
              animate={{ scale: [1, 1.5], opacity: [0.6, 0] }} 
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-[2px] border-[var(--accent-primary)]"
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* While loading: show ONLY ambient presence glow */}
      <AnimatePresence>
        {!isLoaded && !hasFailed && (
          <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
            <div className="presence-glow" />
          </div>
        )}
      </AnimatePresence>

      {/* Model Reveal: fade in over 500ms, opacity 0 to 1, scale 0.98 to 1 once fully posed & idle-animating */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: isLoaded ? 1 : 0, scale: isLoaded ? 1 : 0.98 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full h-full"
      >
        <Canvas 
          frameloop={isTabVisible ? "always" : "never"}
          camera={{ position: [0, 1.3, 2.0], fov: 45 }} 
          gl={{ 
            alpha: true, 
            antialias: true, 
            powerPreference: "default",
            stencil: false,
            depth: true,
            failIfMajorPerformanceCaveat: false
          }}
          onCreated={({ gl }) => {
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
          }}
          dpr={1}
        >
          <CameraRig mode={effectiveWardrobeOpen ? 'panned-left' : (effectivePortraitMode ? 'portrait' : 'room-wide')} vrmScene={vrmSceneRef} />
          
          <RoomEnvironment />

          <Suspense fallback={null}>
            <VRMModel 
              url={activeModelId} 
              emotion={emotion}
              isProcessing={isProcessing}
              onLoaded={(scene) => {
                setVrmSceneRef(scene);
                setIsLoaded(true);
                onModelLoaded?.();
              }} 
              onError={handleError}
              retryKey={retryKey}
            />
          </Suspense>
        </Canvas>
      </motion.div>
    </div>
  );
}

const CompanionStage = memo(CompanionStageComponent);
export default CompanionStage;
