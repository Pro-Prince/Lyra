import { useEffect, useRef, useState, Suspense, memo, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw } from 'lucide-react';

import { useToast } from '../hooks/useToast';
import { useCompanionMovement } from '../hooks/useCompanionMovement';
import { RoomEnvironment } from './RoomEnvironment';
import { applyRestPose, settleVRMPhysics, resetToNeutralExpression } from '../lib/poseUtils';
import { getCachedOutfit, preloadAllOutfits } from '../lib/outfitCache';
import { loadCompanionModel, safeUpdateMatrixWorld, safeSetFromObject, safeUpdateVRM, disposeVRM } from '../lib/companionRenderer';
import { vrmAudioSync } from '../lib/vrmAudioSync';
import { performanceController } from '../lib/PerformanceController';
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
  warm: { happy: 0.15, relaxed: 0.0, surprised: 0.0, neutral: 0.85, sad: 0.0 },
  playful: { happy: 0.35, relaxed: 0.0, surprised: 0.1, neutral: 0.55, sad: 0.0 },
  thoughtful: { happy: 0.05, relaxed: 0.0, surprised: 0.05, neutral: 0.9, sad: 0.0 },
  excited: { happy: 0.5, relaxed: 0.0, surprised: 0.2, neutral: 0.3, sad: 0.0 },
  calm: { happy: 0.1, relaxed: 0.0, surprised: 0.0, neutral: 0.9, sad: 0.0 },
  affectionate: { happy: 0.3, relaxed: 0.0, surprised: 0.0, neutral: 0.7, sad: 0.0 },
  shy: { happy: 0.1, relaxed: 0.0, surprised: 0.05, neutral: 0.85, sad: 0.0 }
};

import { HUMAN_REST_EULERS } from '../lib/poseUtils';
import { buildGestureLibrary } from '../lib/gestureLibrary';

function createGestureClips(vrm: VRM): Record<string, THREE.AnimationClip> {
  return buildGestureLibrary(vrm);
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
  const fullBodyFraming = useRef({ midY: 0.78, distance: 3.35 });

  // Compute camera framing ONCE per VRM load and on resize - NEVER inside useFrame!
  const updateFraming = () => {
    if (!vrmScene) return;
    safeUpdateMatrixWorld(vrmScene);
    const box = safeSetFromObject(new THREE.Box3(), vrmScene);
    const headTop = box.max.y || 1.55;
    const feetBottom = Math.min(box.min.y || 0, 0);
    const totalHeight = Math.max(1.2, headTop - feetBottom);

    const perspCam = camera as THREE.PerspectiveCamera;
    const fov = perspCam.fov * (Math.PI / 180);

    // 1. Portrait Framing (Bust / Head & Shoulders)
    const shoulderY = headTop - totalHeight * 0.25;
    const portraitTargetHeight = Math.max(0.2, headTop - shoulderY);
    let portraitDist = (portraitTargetHeight * 1.4) / (2 * Math.tan(fov / 2));
    if (perspCam.aspect < 1.0) {
      portraitDist = portraitDist / perspCam.aspect;
    }
    const portraitMidY = (headTop + shoulderY) / 2;
    portraitFraming.current = { midY: portraitMidY, distance: portraitDist };

    // 2. Full-Body Room Framing (Ensures full legs, shoes, and headroom are framed cleanly above bottom buttons)
    const fullBodyPaddingFactor = perspCam.aspect < 1.0 ? 1.32 : 1.30;
    let fullBodyDist = (totalHeight * fullBodyPaddingFactor) / (2 * Math.tan(fov / 2));
    if (perspCam.aspect < 1.0) {
      // In narrow/mobile screens, scale distance dynamically so feet and shoes are completely framed above control bar
      fullBodyDist = fullBodyDist / Math.max(0.68, perspCam.aspect);
    }
    const fullBodyMidY = (headTop + feetBottom) * 0.5;
    fullBodyFraming.current = { midY: fullBodyMidY, distance: fullBodyDist };
  };

  useEffect(() => {
    updateFraming();
  }, [vrmScene, camera]);

  useEffect(() => {
    const canvasContainer = gl.domElement.parentElement;
    if (!canvasContainer) return;

    let resizeRaf: number | null = null;
    const updateCamera = () => {
      const width = canvasContainer.clientWidth;
      const height = canvasContainer.clientHeight;
      if (width > 0 && height > 0) {
        const perspCam = camera as THREE.PerspectiveCamera;
        perspCam.aspect = width / height;
        perspCam.updateProjectionMatrix();
        updateFraming();
      }
    };

    const ro = new ResizeObserver(() => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(updateCamera);
    });
    ro.observe(canvasContainer);
    updateCamera();

    return () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      ro.disconnect();
    };
  }, [camera, gl, vrmScene]);

  const fallbackVec = useRef(new THREE.Vector3(0, 0, 0));
  const isInitialSnapRef = useRef(true);

  useEffect(() => {
    isInitialSnapRef.current = true;
  }, [vrmScene, mode]);

  useFrame(() => {
    const companionPosition = vrmScene ? vrmScene.position : fallbackVec.current;
    const { distance } = fullBodyFraming.current;

    if (vrmScene && mode === 'portrait') {
      const { midY: pMidY, distance: pDist } = portraitFraming.current;
      targetPos.current.set(companionPosition.x, Math.max(0.6, pMidY), companionPosition.z + pDist);
      lookTarget.current.set(companionPosition.x, pMidY, companionPosition.z);
    } else if (mode === 'panned-left') {
      // Offset camera to frame character on the left when wardrobe is open, full body visible with gentle upward tilt
      targetPos.current.set(companionPosition.x - 0.7, 0.72, companionPosition.z + distance);
      lookTarget.current.set(companionPosition.x - 0.35, 1.05, companionPosition.z);
    } else {
      // 'room-wide' / 'centered': camera positioned higher than target to look down at her from above, with lookY higher to shift avatar lower on screen
      const isMobileAspect = (camera as THREE.PerspectiveCamera).aspect < 1.0;
      const camY = isMobileAspect ? 1.20 : 1.14;
      const lookY = isMobileAspect ? 1.02 : 0.88;
      const effectiveDist = isMobileAspect ? distance * 0.90 : distance;
      targetPos.current.set(companionPosition.x, camY, companionPosition.z + effectiveDist);
      lookTarget.current.set(companionPosition.x, lookY, companionPosition.z);
    }

    // Clamp camera Y so it never drops below floor level (floor is y=0)
    targetPos.current.y = Math.max(0.5, targetPos.current.y);

    if (isInitialSnapRef.current) {
      camera.position.copy(targetPos.current);
      camera.lookAt(lookTarget.current);
      isInitialSnapRef.current = false;
    } else {
      camera.position.lerp(targetPos.current, 0.08);
      camera.lookAt(lookTarget.current);
    }
  });
  return null;
}

// removed StandingSurface, Starfield, AnimatedLighting

interface VRMModelProps {
  url: string;
  emotion?: string;
  isProcessing?: boolean;
  isListening?: boolean;
  isMuted?: boolean;
  onProgress?: (percent: number) => void;
  onLoaded?: (scene: THREE.Group) => void;
  onReset?: () => void;
  onError?: (error: string) => void;
  retryKey?: number;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function updateBreathing(vrm: VRM | null, breathPhase: { current: number }, delta: number, currentEmotion: string = 'warm') {
  if (!vrm || !vrm.humanoid) return;

  const breathingRateMap: Record<string, number> = {
    playful: 1.4,
    excited: 1.45,
    happy: 1.25,
    calm: 0.85,
    thoughtful: 0.9,
    affectionate: 1.3,
    shy: 1.15,
    warm: 1.0
  };
  const rate = breathingRateMap[currentEmotion] || 1.0;

  breathPhase.current += delta * rate * 2.2;
  const chest = vrm.humanoid.getNormalizedBoneNode('upperChest') ||
                vrm.humanoid.getNormalizedBoneNode('chest') ||
                vrm.humanoid.getNormalizedBoneNode('spine');

  if (chest) {
    const breathSin = Math.sin(breathPhase.current);
    // Subtle physical chest scale expansion
    chest.scale.y = 1 + breathSin * 0.008;
    // Organic thoracic tilt and sway
    chest.rotation.x = THREE.MathUtils.lerp(chest.rotation.x, breathSin * 0.007, delta * 4.0);
    chest.rotation.z = THREE.MathUtils.lerp(chest.rotation.z, Math.cos(breathPhase.current * 0.5) * 0.0025, delta * 3.0);
  }
}

function useListeningBehavior(isListening: boolean, vrm: VRM | null) {
  useEffect(() => {
    if (!isListening || !vrm) return;

    // Attentive posture cleanly executed through animation mixer
    performanceController.playGesture('lean_in_listen');

    const nodInterval = setInterval(() => {
      if (Math.random() < 0.5) {
        performanceController.playGesture('nod_gentle');
      }
    }, 4000 + Math.random() * 1500);

    return () => {
      clearInterval(nodInterval);
    };
  }, [isListening, vrm]);
}

function useIdleWatchdog(vrm: VRM | null) {
  useEffect(() => {
    if (!vrm) return;
    const checkInterval = setInterval(() => {
      const idleAction = performanceController.idleAction;
      if (!idleAction) return;

      const idleRunning = idleAction.isRunning();
      const gestureActive = !!performanceController.currentGestureAction && performanceController.currentGestureAction.isRunning();

      if (!idleRunning && !gestureActive) {
        console.warn('Idle was not running and no gesture was active, restarting idle.');
        idleAction.reset().fadeIn(0.3).play();
      }
    }, 3000);

    return () => clearInterval(checkInterval);
  }, [vrm]);
}

/**
 * Human research-accurate blink interval:
 * Conversation rate: ~26/min => avg ~2.3s
 * Resting rate: ~16/min => avg ~3.75s
 */
function getBlinkInterval(isSpeaking: boolean): number {
  const avgInterval = isSpeaking ? 2300 : 3750;
  return avgInterval * (0.6 + Math.random() * 0.8);
}

function useHumanBlinking(vrm: VRM | null, isSpeakingRef: React.MutableRefObject<boolean>) {
  useEffect(() => {
    if (!vrm || !vrm.expressionManager) return;

    let timeoutId: any = null;
    let doubleBlinkTimeoutId: any = null;
    let animFrameId: number | null = null;
    let isDisposed = false;
    let blinkLocked = false; // prevents an overlapping blink from firing mid-blink

    function performBlink() {
      if (isDisposed || !vrm?.expressionManager || blinkLocked) return;
      blinkLocked = true;
      const duration = 130 + Math.random() * 100; // 130-230ms, research-correct physiological range
      const start = performance.now();

      function animateBlink(time: number) {
        if (isDisposed || !vrm?.expressionManager) return;
        const t = Math.min((time - start) / duration, 1);
        const closeAmount = t < 0.5 ? t * 2 : (1 - t) * 2;
        vrm.expressionManager.setValue('blink', closeAmount);

        if (t < 1) {
          animFrameId = requestAnimationFrame(animateBlink);
        } else {
          vrm.expressionManager.setValue('blink', 0); // explicit reset, never left ambiguous or stale
          blinkLocked = false;

          // Natural double-blinks happen rarely (~8%)
          if (Math.random() < 0.08 && !isDisposed) {
            doubleBlinkTimeoutId = setTimeout(() => {
              if (!isDisposed && !blinkLocked) {
                performBlink();
              }
            }, 150);
          }
        }
      }
      animFrameId = requestAnimationFrame(animateBlink);
    }

    function scheduleNextBlink() {
      if (isDisposed) return;
      timeoutId = setTimeout(() => {
        if (!isDisposed) {
          if (!blinkLocked) performBlink();
          scheduleNextBlink();
        }
      }, getBlinkInterval(isSpeakingRef.current));
    }

    vrm.expressionManager.setValue('blink', 0);
    scheduleNextBlink();

    return () => {
      isDisposed = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (doubleBlinkTimeoutId) clearTimeout(doubleBlinkTimeoutId);
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (vrm.expressionManager) {
        vrm.expressionManager.setValue('blink', 0);
      }
    };
  }, [vrm, isSpeakingRef]);
}

function VRMModel({ url, emotion = 'warm', isProcessing = false, isListening = false, isMuted = false, onProgress, onLoaded, onReset, onError, retryKey = 0 }: VRMModelProps) {
  const { camera, gl } = useThree();
  const [vrm, setVrm] = useState<VRM | null>(null);

  useListeningBehavior(isListening, vrm);
  useIdleWatchdog(vrm);

  const lookTarget = useRef(new THREE.Object3D());
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const clips = useRef<Record<string, THREE.AnimationClip>>({});
  const currentAction = useRef<THREE.AnimationAction | null>(null);
  const targetLookAt = useRef(new THREE.Vector3(0, 1.35, 3));
  const restHipsPosition = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let handleOutfitsReady: (() => void) | null = null;

    const setupVRM = async () => {
      try {
        if (onProgress) onProgress(20);
        const vrmInstance = await loadCompanionModel(url);

        if (isCancelled || !vrmInstance) {
          if (!vrmInstance && onError) onError(`Failed to resolve outfit for ${url}`);
          return;
        }

        const cached = getCachedOutfit(url);

        // Apply rest pose & pre-settle physics (skirts, hair, ribbons)
        applyRestPose(vrmInstance);
        settleVRMPhysics(vrmInstance, 90, 0.016);
        resetToNeutralExpression(vrmInstance);

        // Detailed Diagnostics for Checks 1, 2, 3
        // removed console.log
        // removed console.log
        // removed console.log
        // removed console.log

        // Center & floor VRM
        safeUpdateMatrixWorld(vrmInstance.scene);
        const box = safeSetFromObject(new THREE.Box3(), vrmInstance.scene);
        const center = new THREE.Vector3();
        box.getCenter(center);
        vrmInstance.scene.position.x -= center.x;
        vrmInstance.scene.position.z -= center.z;
        vrmInstance.scene.position.y -= box.min.y;
        vrmInstance.scene.rotation.set(0, 0, 0);

        // removed console.log
        // removed console.log

        // Check materials & textures
        vrmInstance.scene.traverse((obj: any) => {
          if (obj.isMesh) {
            // omitted console log to prevent UI lag
          }
        });

        // Setup LookAt target
        lookTarget.current.position.set(0, 1.35, 3);
        vrmInstance.scene.add(lookTarget.current);
        vrmInstance.scene.traverse((obj) => {
          if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            if (obj.material) {
              const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
              materials.forEach((mat: any) => {
                if (mat.isMToonMaterial) {
                  mat.envMapIntensity = 0.15;
                  if (typeof mat.shadeFactor !== 'undefined') {
                    mat.shadeFactor = 0.75;
                  }
                }
              });
            }
          }
        });
        if (vrmInstance.lookAt) {
          vrmInstance.lookAt.target = lookTarget.current;
        }

        const initialHips = vrmInstance.humanoid?.getNormalizedBoneNode('hips');
        if (initialHips) {
          restHipsPosition.current = initialHips.position.clone();
        }

        mixer.current = new THREE.AnimationMixer(vrmInstance.scene);

        // Integrate generated tap gesture clips with loaded Mixamo clips
        const proceduralGestures = createGestureClips(vrmInstance);
        clips.current = {
          ...(cached?.clips || {}),
          ...proceduralGestures,
          idle: proceduralGestures['procedural_idle'],
        };

        handleOutfitsReady = () => {
          if (isCancelled) return;
          const freshCached = getCachedOutfit(url);
          if (freshCached?.clips) {
            clips.current = {
              ...clips.current,
              ...freshCached.clips,
              ...proceduralGestures,
              idle: proceduralGestures['procedural_idle'],
            };
            if (!currentAction.current && clips.current['idle']) {
              playAction('idle', true);
            }
          }
        };
        window.addEventListener('lyraOutfitsReady', handleOutfitsReady);

        let activeGestureAction: THREE.AnimationAction | null = null;
        let activeGestureFinishedListener: ((e: any) => void) | null = null;

        const playGesture = (name: string) => {
          if (!mixer.current || !clips.current[name]) return;
          const clip = clips.current[name];
          const action = mixer.current.clipAction(clip);
          const idleClip = clips.current['idle'] || clips.current['procedural_idle'];
          const idleAction = idleClip ? mixer.current.clipAction(idleClip) : null;

          if (activeGestureFinishedListener && mixer.current) {
            mixer.current.removeEventListener('finished', activeGestureFinishedListener);
            activeGestureFinishedListener = null;
          }
          if (activeGestureAction && activeGestureAction !== action) {
            activeGestureAction.fadeOut(0.35);
          }

          if (idleAction) {
            idleAction.fadeOut(0.35);
          }

          action.reset();
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = false;
          action.fadeIn(0.35);
          action.play();

          activeGestureAction = action;
          currentAction.current = action;

          const onFinished = (e: any) => {
            if (e.action !== action) return;
            if (idleAction) {
              idleAction.enabled = true;
              idleAction.fadeIn(0.4).play();
            }
            action.fadeOut(0.4);
            if (activeGestureAction === action) {
              activeGestureAction = null;
            }
            if (mixer.current && activeGestureFinishedListener === onFinished) {
              mixer.current.removeEventListener('finished', onFinished);
              activeGestureFinishedListener = null;
            }
          };

          activeGestureFinishedListener = onFinished;
          mixer.current.addEventListener('finished', onFinished);
        };

        const playAction = (name: string, loop = true) => {
          if (!mixer.current || !clips.current[name]) return;
          const clip = clips.current[name];
          const action = mixer.current.clipAction(clip);
          action.reset();
          action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
          action.clampWhenFinished = false;
          action.play();
          currentAction.current = action;
        };

        const crossfadeToAction = (name: string, duration = 0.5, loop = true) => {
          if (!mixer.current || !clips.current[name]) return;
          const clip = clips.current[name];
          const nextAction = mixer.current.clipAction(clip);
          nextAction.reset();
          nextAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
          nextAction.clampWhenFinished = false;
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
                   const idleName = clips.current['idle'] ? 'idle' : 'procedural_idle';
                   crossfadeToAction(idleName, 0.4, true);
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

        // Initialize central PerformanceController with VRM and clips
        performanceController.init(vrmInstance, mixer.current, clips.current);

        if (clips.current['idle']) {
          performanceController.idleAction = mixer.current.clipAction(clips.current['idle']);
          playAction('idle', true);
        } else if (clips.current['procedural_idle']) {
          performanceController.idleAction = mixer.current.clipAction(clips.current['procedural_idle']);
          playAction('procedural_idle', true);
        }

        if (onProgress) onProgress(100);
        if (onLoaded) onLoaded(vrmInstance.scene);

        resetToNeutralExpression(vrmInstance);
        setVrm(vrmInstance);
      } catch (err: any) {
        if (isCancelled) return;
        if (onError) onError(err?.message || String(err));
      }
    };

    setupVRM();

    return () => {
      isCancelled = true;
      if (handleOutfitsReady) {
        window.removeEventListener('lyraOutfitsReady', handleOutfitsReady);
      }
      setVrm(prev => {
        if (prev) {
          disposeVRM(prev);
        }
        return null;
      });
      if (onReset) onReset();
      if (mixer.current) {
        mixer.current.stopAllAction();
      }
    };
  }, [url, retryKey]);

  const isSpeakingRef = useRef(false);
  useHumanBlinking(vrm, isSpeakingRef);

  const saccadeState = useRef({
    nextSaccadeTime: 0.2 + Math.random() * 0.4,
    offset: new THREE.Vector3(),
    targetOffset: new THREE.Vector3(),
  });

  const breathPhaseRef = useRef(0);

  const currentViseme = useRef<string>('neutral');
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    analyserRef.current = vrmAudioSync.getAnalyser();
    const handleSpeak = (e: any) => { currentViseme.current = e.detail; };
    window.addEventListener('lyraSpeak', handleSpeak);
    return () => window.removeEventListener('lyraSpeak', handleSpeak);
  }, []);

  useEffect(() => {
    const handleSpeechStart = (e: any) => {
      if (isMuted) return; // Disregard speech events if Lyra is muted
      isSpeakingRef.current = true;
      const { audioElement, text, duration, emotion: emotionTag } = e.detail || {};
      const speechText = text || '';
      const speechDuration = duration || Math.max(1.5, speechText.length * 0.075);
      performanceController.startSpeechPerformance(
        audioElement || null,
        speechText,
        emotionTag || emotion,
        speechDuration
      );
    };

    const handleSpeechEnd = () => {
      isSpeakingRef.current = false;
      performanceController.stopSpeechPerformance();
      if (vrm) {
        resetToNeutralExpression(vrm);
      }
    };

    window.addEventListener('lyraSpeechStart', handleSpeechStart);
    window.addEventListener('lyraSpeechEnd', handleSpeechEnd);

    return () => {
      window.removeEventListener('lyraSpeechStart', handleSpeechStart);
      window.removeEventListener('lyraSpeechEnd', handleSpeechEnd);
    };
  }, [emotion, vrm, isMuted]);

  useEffect(() => {
    if (isMuted) {
      isSpeakingRef.current = false;
      performanceController.stopSpeechPerformance();
      if (vrm) {
        resetToNeutralExpression(vrm);
        if (vrm.expressionManager) {
          for (let i = 0; i < VISEMES.length; i++) {
            vrm.expressionManager.setValue(VISEMES[i], 0);
          }
        }
      }
    }
  }, [isMuted, vrm]);

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
      onInteract: (_gesture) => {
        // Maintain composed, direct eye contact on click rather than parallax jumping
        targetLookAt.current.set(0, 1.35, 3);
      },
    });

    return () => {
      if (lookAtTimer) clearTimeout(lookAtTimer);
      interactionMgr.dispose();
    };
  }, [vrm, camera, gl.domElement]);

  const movement = useCompanionMovement(vrm?.scene || null);
  const elapsedTimeRef = useRef(0);
  const _tempGaze = useRef(new THREE.Vector3());
  const audioBufferRef = useRef<Uint8Array | null>(null);

  const frameCountRef = useRef(0);

  useFrame((_, delta) => {
    if (!vrm || !vrm.scene || !vrm.scene.parent) return;
    
    try {
      const safeDelta = Math.min(delta, 0.04);
      elapsedTimeRef.current += safeDelta;
      const time = elapsedTimeRef.current;
      frameCountRef.current++;

      movement.update(safeDelta);
      performanceController.update();

      // Procedural breathing tied dynamically to emotional state & expansion
      updateBreathing(vrm, breathPhaseRef, safeDelta, emotion);

      // Eye Saccades (subtle micro gaze shifts every 200-600ms)
      const saccade = saccadeState.current;
      if (time > saccade.nextSaccadeTime) {
        saccade.nextSaccadeTime = time + 0.25 + Math.random() * 0.55;
        saccade.targetOffset.set(
          (Math.random() - 0.5) * 0.035,
          (Math.random() - 0.5) * 0.022,
          0
        );
      }
      saccade.offset.lerp(saccade.targetOffset, safeDelta * 12);

      // Gaze tracking damping with saccade overlay
      const isMobile = window.innerWidth < 768;
      if (!isMobile || frameCountRef.current % 2 === 0) {
        _tempGaze.current.copy(targetLookAt.current).add(saccade.offset);
        if (isProcessing) {
           _tempGaze.current.set(0, 1.15, 2.8).add(saccade.offset);
        }
        lookTarget.current.position.lerp(_tempGaze.current, 0.09);
      }

      // Secondary speech cadence & micro-nodding synced with audio (handled cleanly)

      // Emotion & Lip Sync (expression blendshapes)
      if (vrm.expressionManager) {
        const targetExpr = EMOTION_EXPRESSIONS[emotion] || EMOTION_EXPRESSIONS.warm;
        const happyVal = vrm.expressionManager.getValue('happy') || 0;
        const relaxedVal = vrm.expressionManager.getValue('relaxed') || 0;
        const surprisedVal = vrm.expressionManager.getValue('surprised') || 0;

        vrm.expressionManager.setValue('happy', THREE.MathUtils.lerp(happyVal, targetExpr.happy, safeDelta * 3.5));
        vrm.expressionManager.setValue('relaxed', THREE.MathUtils.lerp(relaxedVal, targetExpr.relaxed, safeDelta * 3.5));
        vrm.expressionManager.setValue('surprised', THREE.MathUtils.lerp(surprisedVal, targetExpr.surprised, safeDelta * 3.5));

        const isBlush = emotion === 'affectionate' || emotion === 'shy';
        const currentBlush = vrm.expressionManager.getValue('blush') || 0;
        const targetBlush = isBlush ? 1.0 : 0.0;
        if (Math.abs(currentBlush - targetBlush) > 0.01) {
          vrm.expressionManager.setValue('blush', THREE.MathUtils.lerp(currentBlush, targetBlush, safeDelta * 3.5));
        }

        // Dual-Engine Lip Sync: real-time frequency analysis + phoneme beat synthesis + viseme events
        const visemeWeights = vrmAudioSync.update(safeDelta);
        const eventViseme = currentViseme.current;
        const speakingNow = !isMuted && (isSpeakingRef.current || vrmAudioSync.getIsSpeaking() || (eventViseme !== 'neutral' && eventViseme !== 'closed'));

        if (speakingNow) {
          for (let i = 0; i < VISEMES.length; i++) {
            const v = VISEMES[i];
            const currentWeight = vrm.expressionManager.getValue(v) || 0;
            let targetWeight = visemeWeights[v] || 0;

            // If an explicit viseme event was dispatched (e.g. from speech playback) and audio weights are low, blend event viseme
            if (eventViseme === v && targetWeight < 0.25) {
              targetWeight = 0.65;
            }

            if (Math.abs(currentWeight - targetWeight) > 0.005) {
              vrm.expressionManager.setValue(v, THREE.MathUtils.lerp(currentWeight, targetWeight, safeDelta * 24));
            }
          }
        } else {
          // Actively decay all mouth visemes back to 0 when not speaking or when muted
          for (let i = 0; i < VISEMES.length; i++) {
            const v = VISEMES[i];
            const currentWeight = vrm.expressionManager.getValue(v) || 0;
            if (currentWeight > 0.005) {
              vrm.expressionManager.setValue(v, THREE.MathUtils.lerp(currentWeight, 0, safeDelta * 25));
            } else if (currentWeight !== 0) {
              vrm.expressionManager.setValue(v, 0);
            }
          }
        }
      }

      // Exactly ONE authority drives skeletal body pose: AnimationMixer
      if (mixer.current) {
        mixer.current.update(safeDelta);
      }

      // Anchor hips bone translation to grounded rest position so crossfades cannot displace avatar
      if (vrm && restHipsPosition.current) {
        const hipsNode = vrm.humanoid?.getNormalizedBoneNode('hips');
        if (hipsNode) {
          hipsNode.position.copy(restHipsPosition.current);
        }
      }

      safeUpdateVRM(vrm, safeDelta);
    } catch (frameErr) {
      console.warn('[CompanionStage useFrame] Handled frame update exception:', frameErr);
    }
  });

  if (!vrm) return null;

  return <primitive object={vrm.scene} position={[0, 0, 0]} />;
}

function CustomPostProcessing() {
  const { gl, scene, camera, size } = useThree();
  
  const composer = useMemo(() => {
    const comp = new EffectComposer(gl);
    comp.setPixelRatio(gl.getPixelRatio());
    comp.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      0.14, // Delicate cozy anime bloom without cyberpunk glare
      0.4,
      0.90  // High threshold for gentle lamp & accent softness
    );
    comp.addPass(bloom);
    const film = new FilmPass(0.04, false);
    comp.addPass(film);
    const outputPass = new OutputPass();
    comp.addPass(outputPass);
    return comp;
  }, [gl, scene, camera]);

  useEffect(() => {
    composer.setSize(size.width, size.height);
    composer.setPixelRatio(gl.getPixelRatio());
  }, [composer, size, gl]);

  useFrame(() => {
    composer.render();
  }, 1);

  return null;
}

import React from 'react';

class StageErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[StageErrorBoundary] Caught WebGL/Stage exception:', error);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-[#3A2335] text-white">
          <p className="text-xs text-neutral-300 mb-2">Graphics engine restarting...</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="px-3 py-1.5 rounded-lg bg-pink-500/80 hover:bg-pink-500 text-xs font-medium cursor-pointer"
          >
            Reload View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function RoomFadeIn({ isLoaded, children }: { isLoaded: boolean; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      // Small frame delay (120ms) so WebGL finishes compiling initial textures and camera snaps
      const timer = setTimeout(() => setVisible(true), 120);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [isLoaded]);

  return (
    <div className="room-fade-wrapper relative w-full h-full">
      {children}
      <div 
        className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ease-in-out bg-[#241623] z-20 ${visible ? 'opacity-0' : 'opacity-100'}`} 
      />
    </div>
  );
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
  isListening = false,
  silentError = false,
  transparentBg = false,
  className = '',
  mode,
  onModelLoaded,
  onError,
  isActive = true,
  isMuted = false
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
  isListening?: boolean;
  silentError?: boolean;
  transparentBg?: boolean;
  onModelLoaded?: () => void;
  onError?: (err?: string) => void;
  isActive?: boolean;
  isMuted?: boolean;
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
      showInfo("One moment, she's settling back in.", { action: { label: "Retry", onClick: () => {
          retryCount.current = 0;
          handleRetry();
        } } });
    }
  };

  useEffect(() => {
    setIsLoaded(false);
    setHasFailed(false);
    setVrmSceneRef(null);
  }, [activeModelId]);

  const showOpaqueBg = !transparentBg;

  if (hasFailed && silentError) {
    return null;
  }

  const dpr = useMemo(() => {
    if (typeof window === 'undefined') return 1;
    // High-performance strategy: Limit DPR on mobile to 1.0 or 1.25 to prevent lag
    // Desktop gets max 1.5 for crispness without wasting GPU cycles on 4K+ screens
    const isMobile = window.innerWidth < 768;
    const baseDpr = window.devicePixelRatio || 1;
    return isMobile ? Math.min(baseDpr, 1.0) : Math.min(baseDpr, 1.5);
  }, []);

  const glSettings = useMemo(() => ({ 
    preserveDrawingBuffer: true,
    alpha: true, 
    antialias: true, 
    powerPreference: "high-performance" as const,
    stencil: false,
    depth: true,
    failIfMajorPerformanceCaveat: false,
    precision: "mediump" as const // Use medium precision for mobile performance
  }), []);

  return (
    <div className={`w-full h-full relative overflow-hidden flex items-center justify-center select-none ${showOpaqueBg ? 'bg-[#ede2dc]' : 'bg-transparent'} ${className}`}>
      {showOpaqueBg && <div className="absolute inset-0 transition-colors duration-500 bg-[#ede2dc]" />}

      {/* Responsive Room Environment Background Image */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden bg-[#241623]">
        {/* Desktop Version Image (used for screen width >= 768px) */}
        <img
          src="/Room-Desktop-Version.png"
          alt="Room Environment Desktop"
          className="hidden md:block w-full h-full object-cover object-center"
        />
        {/* Mobile Version Image (used for screen width < 768px) */}
        <img
          src="/Room-Mobile-Version.png"
          alt="Room Environment Mobile"
          className="block md:hidden w-full h-full object-cover object-center"
        />
      </div>
      
      <AnimatePresence>
        {hasFailed && !silentError && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center pointer-events-auto bg-black/60 backdrop-blur-sm"
          >
            <div className="max-w-md w-full p-6 rounded-2xl bg-[var(--bg-surface,#18181b)]/90 border border-red-500/30 shadow-2xl flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white">Couldn't Load Outfit</h3>
              <p className="text-xs text-neutral-300 leading-relaxed max-w-xs">
                We ran into a problem loading this look. Tap below to reload.
              </p>
              <button
                onClick={() => {
                  retryCount.current = 0;
                  handleRetry();
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:brightness-110 text-white text-xs font-medium shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 w-full h-full"
      >
      <RoomFadeIn isLoaded={isLoaded}>
        <StageErrorBoundary onError={(err) => handleError(err?.message)}>
          <Canvas shadows 
            id="companion-canvas-container"
            frameloop={isTabVisible && isActive ? "always" : "never"}
            camera={{ position: [0, 1.14, 3.8], fov: 35 }} 
            gl={glSettings}
            onCreated={({ gl, scene }) => {
              gl.domElement.id = 'companion-webgl-canvas';
              
              // Safe WebGL context restoration handlers for mobile OS background/resume
              const handleContextLost = (e: Event) => {
                e.preventDefault();
                console.warn('[CompanionStage] WebGL context lost - preventing default crash.');
              };
              const handleContextRestored = () => {
                console.info('[CompanionStage] WebGL context restored.');
                handleRetry();
              };
              gl.domElement.addEventListener('webglcontextlost', handleContextLost, false);
              gl.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);

              gl.setClearColor(0x000000, 0);
              scene.background = null;
              scene.fog = null;
              gl.shadowMap.enabled = true;
              gl.shadowMap.type = THREE.PCFSoftShadowMap;
              gl.outputColorSpace = THREE.SRGBColorSpace;
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 0.88;
            }}
            dpr={dpr}
          >
            <CameraRig mode={effectiveWardrobeOpen ? 'panned-left' : (effectivePortraitMode ? 'portrait' : 'room-wide')} vrmScene={vrmSceneRef} />
            
            <RoomEnvironment />
            {/* <CustomPostProcessing /> Removed to fix baseline lag */}

            <Suspense fallback={null}>
              <VRMModel 
                url={activeModelId} 
                emotion={emotion}
                isProcessing={isProcessing}
                isListening={isListening}
                isMuted={isMuted}
                onLoaded={(scene) => {
                  setVrmSceneRef(scene);
                  setIsLoaded(true);
                  onModelLoaded?.();
                }} 
                onReset={() => {
                  setVrmSceneRef(null);
                  setIsLoaded(false);
                }}
                onError={handleError}
                retryKey={retryKey}
              />
            </Suspense>
          </Canvas>
        </StageErrorBoundary>
      </RoomFadeIn>
        
        {/* Soft Cozy Vignette Overlay */}
        <div className="pointer-events-none absolute inset-0 z-20" style={{ background: 'radial-gradient(ellipse at center, transparent 75%, rgba(42,24,38,0.2) 100%)' }} />
      </motion.div>
    </div>
  );
}

const CompanionStage = memo(CompanionStageComponent);
export default CompanionStage;
