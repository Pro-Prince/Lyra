import { useEffect, useRef, useState, Suspense, memo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { getCachedModelBuffer, setCachedModelBuffer, clearCachedModelBuffer, isValidGLTFBuffer, fetchAndCacheVRMModel } from '../lib/vrmCache';

// Scratch variables to guarantee zero-allocation render loop on mobile GPUs
const SCRATCH_COLOR_A = new THREE.Color();
const SCRATCH_COLOR_B = new THREE.Color();
const SCRATCH_COLOR_C = new THREE.Color();
const SCRATCH_VEC_A = new THREE.Vector3();
const SCRATCH_VEC_B = new THREE.Vector3();
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
  calm: { happy: 0.2, relaxed: 0.75, surprised: 0.0, neutral: 0.3, sad: 0.0 }
};

function CameraSetup({ isCallMode }: { isCallMode: boolean }) {
  const { camera, size } = useThree();
  const aspect = size.width / Math.max(size.height, 1);

  useFrame((state, delta) => {
    const isMobilePortrait = aspect < 0.75;
    const isTabletOrSquare = aspect >= 0.75 && aspect < 1.2;
    
    // Adaptive framing: perfectly centered portrait framing so Lyra fills the stage without awkward cropping
    const targetY = isMobilePortrait ? 1.30 : (isTabletOrSquare ? 1.32 : 1.33);
    const targetZ = isCallMode 
      ? (isMobilePortrait ? 1.55 : 1.35) 
      : (isMobilePortrait ? 1.80 : (isTabletOrSquare ? 1.62 : 1.46));
    const targetLookAtY = isMobilePortrait ? 1.26 : 1.31;
    
    const targetFov = isCallMode ? 36 : (isMobilePortrait ? 46 : 42);
    const cam = state.camera as THREE.PerspectiveCamera;
    const safeDelta = Math.min(delta, 0.05);

    cam.position.x = THREE.MathUtils.lerp(cam.position.x, 0, safeDelta * 4);
    cam.position.y = THREE.MathUtils.lerp(cam.position.y, targetY, safeDelta * 4);
    cam.position.z = THREE.MathUtils.lerp(cam.position.z, targetZ, safeDelta * 4);
    cam.lookAt(0, targetLookAtY, 0);

    if (Math.abs(cam.fov - targetFov) > 0.05) {
      cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov, safeDelta * 4);
      cam.updateProjectionMatrix();
    }
  });

  return null;
}

// Lazy-loaded starfield, only instantiated and rendered when scenery is night
function Starfield() {
  const pointsRef = useRef<THREE.Points>(null);
  
  const [geometry] = useState(() => {
    const geo = new THREE.BufferGeometry();
    const count = 250; // Optimized count for mobile fillrate
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = Math.random() * 5 + 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  });

  useFrame((state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += Math.min(delta, 0.05) * 0.02;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry attach="geometry" {...geometry} />
      <pointsMaterial size={0.025} color="#ffffff" transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

function AnimatedLighting({ scenery, accentColor }: { scenery: string; accentColor: string }) {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const keyRef = useRef<THREE.DirectionalLight>(null);
  const fillRef = useRef<THREE.DirectionalLight>(null);
  const safeAccent = resolveHexColor(accentColor, "#FF8FC0");

  useFrame((state, delta) => {
    const safeDelta = Math.min(delta, 0.05);
    const lerpSpeed = safeDelta * 4;

    // Soft warm pink-peach ambient tone
    SCRATCH_COLOR_A.set("#FFEBF4");
    let targetAmbientIntensity = 0.7;
    
    // Warm key light
    SCRATCH_COLOR_B.set("#FFF5F8");
    let targetKeyIntensity = 1.05;
    
    // Soft warm peach-pink fill light
    SCRATCH_COLOR_C.set(safeAccent || "#FF8FC0");
    let targetFillIntensity = 0.6;
    SCRATCH_VEC_A.set(-2, 1, 3);

    if (scenery === 'cozy') {
      // Warm golden-pink cozy glow
      SCRATCH_COLOR_A.set("#FFF0E6");
      targetAmbientIntensity = 0.65;
      targetKeyIntensity = 0.95;
      targetFillIntensity = 0.5;
    } else if (scenery === 'dusk') {
      // Soft twilight lavender-pink glow
      SCRATCH_COLOR_A.set("#F4E8FF");
      targetAmbientIntensity = 0.55;
      targetKeyIntensity = 0.85;
      targetFillIntensity = 0.55;
      SCRATCH_VEC_A.set(-2, 1.2, 2);
    } else if (scenery === 'night') {
      // Subtle starry pink-purple ambient
      SCRATCH_COLOR_A.set("#EBDDFF");
      targetAmbientIntensity = 0.45;
      targetKeyIntensity = 0.75;
      targetFillIntensity = 0.45;
    }
    
    if (ambientRef.current) {
      ambientRef.current.color.lerp(SCRATCH_COLOR_A, lerpSpeed);
      ambientRef.current.intensity = THREE.MathUtils.lerp(ambientRef.current.intensity, targetAmbientIntensity, lerpSpeed);
    }
    if (keyRef.current) {
      keyRef.current.color.lerp(SCRATCH_COLOR_B, lerpSpeed);
      keyRef.current.intensity = THREE.MathUtils.lerp(keyRef.current.intensity, targetKeyIntensity, lerpSpeed);
    }
    if (fillRef.current) {
      fillRef.current.color.lerp(SCRATCH_COLOR_C, lerpSpeed);
      fillRef.current.intensity = THREE.MathUtils.lerp(fillRef.current.intensity, targetFillIntensity, lerpSpeed);
      fillRef.current.position.lerp(SCRATCH_VEC_A, lerpSpeed);
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.7} color="#FFEBF4" />
      <directionalLight ref={keyRef} position={[2, 3, 2]} intensity={1.05} color="#FFF5F8" />
      <directionalLight ref={fillRef} position={[-2, 1, 3]} intensity={0.6} color={safeAccent} />
    </>
  );
}

interface VRMModelProps {
  url: string;
  emotion?: string;
  onProgress?: (percent: number) => void;
  onLoaded?: () => void;
  onError?: (error: string) => void;
  retryKey?: number;
}

function VRMModel({ url, emotion = 'warm', onProgress, onLoaded, onError, retryKey = 0 }: VRMModelProps) {
  const [vrm, setVrm] = useState<VRM | null>(null);

  const lookAtTarget = useRef(new THREE.Object3D());
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const clips = useRef<Record<string, THREE.AnimationClip>>({});
  const currentAction = useRef<THREE.AnimationAction | null>(null);
  const targetLookAt = useRef(new THREE.Vector3(0, 1.35, 3));
  const lastInteractionTime = useRef<number>(Date.now());

  useEffect(() => {
    let currentVrm: VRM | null = null;
    let isCancelled = false;
    const abortController = new AbortController();

    // 25-second hard timeout for model fetch & parse
    const timeoutId = setTimeout(() => {
      abortController.abort(new Error("Model download timed out (25 seconds limit reached)."));
    }, 25000);

    const loadVRM = async () => {
      try {
        console.log(`[CompanionStage] Loading VRM model: ${url} (attempt ${retryKey + 1})`);
        if (onProgress) onProgress(10);

        const arrayBuffer = await fetchAndCacheVRMModel(url, abortController.signal);
        if (onProgress) onProgress(95);

        clearTimeout(timeoutId);
        if (isCancelled || !arrayBuffer) return;

        // Parse with GLTFLoader and VRMLoaderPlugin
        const loader = new GLTFLoader();
        loader.register((parser) => new VRMLoaderPlugin(parser));

        const resourcePath = url.includes('/') ? url.substring(0, url.lastIndexOf('/') + 1) : '/models/';

        loader.parse(
          arrayBuffer,
          resourcePath,
          (gltf) => {
            if (isCancelled) return;
            const vrmInstance = gltf.userData.vrm as VRM;
            if (!vrmInstance) {
              const err = new Error("File parsed successfully as glTF, but contains no VRM humanoid metadata.");
              console.error(`[CompanionStage] VRM extension missing for ${url}:`, err);
              if (onError) onError(err.message);
              return;
            }

            VRMUtils.removeUnnecessaryVertices(gltf.scene);
            VRMUtils.removeUnnecessaryJoints(gltf.scene);
            vrmInstance.scene.traverse((obj) => {
              obj.frustumCulled = false;
              if (obj instanceof THREE.Mesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
              }
            });

            // Setup LookAt target
            lookAtTarget.current.position.set(0, 1.35, 3);
            vrmInstance.scene.add(lookAtTarget.current);
            if (vrmInstance.lookAt) {
              vrmInstance.lookAt.target = lookAtTarget.current;
            }

            // Setup Animation Mixer
            mixer.current = new THREE.AnimationMixer(vrmInstance.scene);

            // Generate programmatic gesture clips with zero memory overhead
            const head = vrmInstance.humanoid.getNormalizedBoneNode('head');
            const chest = vrmInstance.humanoid.getNormalizedBoneNode('chest');
            const upperArm = vrmInstance.humanoid.getNormalizedBoneNode('rightUpperArm');
            const lowerArm = vrmInstance.humanoid.getNormalizedBoneNode('rightLowerArm');

            const makeTrack = (node: THREE.Object3D | null, eulers: THREE.Euler[], times: number[]) => {
              if (!node) return null;
              const values = eulers.flatMap(e => new THREE.Quaternion().setFromEuler(e).toArray());
              return new THREE.QuaternionKeyframeTrack(node.name + '.quaternion', times, values);
            };

            const qZero = new THREE.Euler(0, 0, 0);

            // Gesture: Wave
            if (upperArm && lowerArm) {
              const tWaveUp = makeTrack(upperArm, [
                qZero,
                new THREE.Euler(0, 0, -Math.PI / 2.2),
                new THREE.Euler(0, 0, -Math.PI / 2.2),
                qZero
              ], [0, 0.3, 1.7, 2.0]);

              const tWaveLow = makeTrack(lowerArm, [
                qZero,
                qZero,
                new THREE.Euler(0, 0, -0.5),
                new THREE.Euler(0, 0, 0.5),
                new THREE.Euler(0, 0, -0.5),
                new THREE.Euler(0, 0, 0.5),
                new THREE.Euler(0, 0, 0),
                qZero
              ], [0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.7, 2.0]);

              if (tWaveUp && tWaveLow) {
                clips.current['wave'] = new THREE.AnimationClip('wave', 2.0, [tWaveUp, tWaveLow]);
              }
            }

            // Gesture: Nod
            if (head) {
              const tNod = makeTrack(head, [
                qZero,
                new THREE.Euler(0.2, 0, 0),
                new THREE.Euler(0.2, 0, 0),
                qZero
              ], [0, 0.2, 0.4, 0.6]);
              if (tNod) clips.current['nod'] = new THREE.AnimationClip('nod', 0.6, [tNod]);
            }

            // Gesture: Twirl
            const hips = vrmInstance.humanoid.getNormalizedBoneNode('hips');
            if (hips) {
              const tTwirl = makeTrack(hips, [
                qZero,
                new THREE.Euler(0, Math.PI, 0),
                new THREE.Euler(0, Math.PI * 1.99, 0),
                new THREE.Euler(0, Math.PI * 2, 0)
              ], [0, 0.4, 0.75, 0.8]);
              if (tTwirl) clips.current['twirl'] = new THREE.AnimationClip('twirl', 0.8, [tTwirl]);
            }

            // Gesture: Laugh
            if (chest && head) {
              const tLaughChest = makeTrack(chest, [
                qZero,
                new THREE.Euler(-0.05, 0, 0),
                qZero,
                new THREE.Euler(-0.05, 0, 0),
                qZero,
                qZero
              ], [0, 0.15, 0.3, 0.45, 0.6, 1.0]);

              const tLaughHead = makeTrack(head, [
                qZero,
                new THREE.Euler(-0.1, 0, 0),
                qZero,
                new THREE.Euler(-0.1, 0, 0),
                qZero,
                qZero
              ], [0, 0.15, 0.3, 0.45, 0.6, 1.0]);
              if (tLaughChest && tLaughHead) clips.current['laugh'] = new THREE.AnimationClip('laugh', 1.0, [tLaughChest, tLaughHead]);
            }

            // Gesture: Think
            if (head && chest) {
              const tThinkHead = makeTrack(head, [
                qZero,
                new THREE.Euler(-0.1, 0.2, 0.1),
                new THREE.Euler(-0.1, 0.2, 0.1),
                qZero
              ], [0, 0.3, 1.5, 1.8]);
              const tThinkChest = makeTrack(chest, [
                qZero,
                new THREE.Euler(0, 0.1, 0),
                new THREE.Euler(0, 0.1, 0),
                qZero
              ], [0, 0.3, 1.5, 1.8]);
              if (tThinkHead && tThinkChest) clips.current['think'] = new THREE.AnimationClip('think', 1.8, [tThinkHead, tThinkChest]);
            }

            // Gesture: Celebrate
            const leftUpperArm = vrmInstance.humanoid.getNormalizedBoneNode('leftUpperArm');
            if (upperArm && leftUpperArm && chest) {
              const tCelChest = makeTrack(chest, [
                qZero,
                new THREE.Euler(-0.1, 0, 0),
                new THREE.Euler(0.05, 0, 0),
                qZero
              ], [0, 0.2, 0.8, 1.2]);
              const tCelArmR = makeTrack(upperArm, [
                qZero,
                new THREE.Euler(0, 0, -Math.PI * 0.8),
                new THREE.Euler(0, 0, -Math.PI * 0.8),
                qZero
              ], [0, 0.2, 0.8, 1.2]);
              const tCelArmL = makeTrack(leftUpperArm, [
                qZero,
                new THREE.Euler(0, 0, Math.PI * 0.8),
                new THREE.Euler(0, 0, Math.PI * 0.8),
                qZero
              ], [0, 0.2, 0.8, 1.2]);
              if (tCelChest && tCelArmR && tCelArmL) clips.current['celebrate'] = new THREE.AnimationClip('celebrate', 1.2, [tCelChest, tCelArmR, tCelArmL]);
            }

            // Global play gesture function with smooth blending
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
                    currentAction.current = null;
                  }
                }
              };
              mixer.current.addEventListener('finished', onFinished);
            };

            // @ts-ignore
            window.playGesture = playGesture;

            // Auto-wave once per session
            if (!sessionStorage.getItem('lyra_has_waved')) {
              sessionStorage.setItem('lyra_has_waved', 'true');
              setTimeout(() => playGesture('wave'), 600);
            }

            const lastOutfit = sessionStorage.getItem('lyra_last_outfit');
            if (lastOutfit && lastOutfit !== url) {
              setTimeout(() => playGesture('twirl'), 250);
            }
            sessionStorage.setItem('lyra_last_outfit', url);

            if (onProgress) onProgress(100);
            if (onLoaded) onLoaded();

            setVrm(vrmInstance);
            currentVrm = vrmInstance;
          },
          async (err) => {
            clearTimeout(timeoutId);
            await clearCachedModelBuffer(url);
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[CompanionStage] GLTF parser error for ${url}:`, err);
            if (onError) onError(`3D model parsing failed: ${msg}`);
          }
        );
      } catch (err: any) {
        clearTimeout(timeoutId);
        await clearCachedModelBuffer(url);
        if (isCancelled) return;
        const msg = err?.message || String(err);
        console.error(`[CompanionStage] Failed to load VRM model from ${url}:`, err);
        if (onError) onError(msg);
      }
    };

    loadVRM();

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      abortController.abort();
      // @ts-ignore
      window.playGesture = undefined;
      if (currentVrm) {
        currentVrm.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const material = (child as THREE.Mesh).material;
            if (Array.isArray(material)) {
              material.forEach(m => m.dispose());
            } else if (material) {
              material.dispose();
            }
            if ((child as THREE.Mesh).geometry) {
              (child as THREE.Mesh).geometry.dispose();
            }
          }
        });
      }
    };
  }, [url, retryKey]);

  const blinkState = useRef({
    nextBlinkTime: 2 + Math.random() * 4,
    isBlinking: false,
    blinkStartTime: 0,
    blinkDuration: 0.15,
  });

  const currentViseme = useRef<string>('neutral');

  useEffect(() => {
    const handleSpeak = (e: any) => {
      currentViseme.current = e.detail;
    };
    window.addEventListener('lyraSpeak', handleSpeak);
    return () => window.removeEventListener('lyraSpeak', handleSpeak);
  }, []);

  // Listen to mobile touch and pointer events for natural gaze tracking
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      lastInteractionTime.current = Date.now();
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      targetLookAt.current.set(normX * 1.5, 1.35 + normY * 0.9, 3);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        lastInteractionTime.current = Date.now();
        const touch = e.touches[0];
        const normX = (touch.clientX / window.innerWidth) * 2 - 1;
        const normY = -(touch.clientY / window.innerHeight) * 2 + 1;
        targetLookAt.current.set(normX * 1.5, 1.35 + normY * 0.9, 3);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const elapsedTimeRef = useRef(0);

  useFrame((_, delta) => {
    if (vrm) {
      const safeDelta = Math.min(delta, 0.04);
      elapsedTimeRef.current += safeDelta;
      const time = elapsedTimeRef.current;

      
      // Idle Breathing Gaze Wander: If untouched on mobile, subtly wander gaze so she feels alive
      const isIdle = (Date.now() - lastInteractionTime.current) > 2500;
      if (isIdle) {
        const wanderX = Math.sin(time * 0.45) * 0.35;
        const wanderY = 1.35 + Math.cos(time * 0.3) * 0.15;
        SCRATCH_VEC_B.set(wanderX, wanderY, 3);
        lookAtTarget.current.position.lerp(SCRATCH_VEC_B, safeDelta * 2.5);
      } else {
        lookAtTarget.current.position.lerp(targetLookAt.current, safeDelta * 4.5);
      }

      // Idle Breathing Animation (applied to spine to avoid conflicting with upper chest gestures)
      const spine = vrm.humanoid.getNormalizedBoneNode('spine');
      if (spine) {
        const breath = Math.sin(time * Math.PI * 0.5);
        spine.rotation.x = breath * 0.015;
      }

      // Blinking Logic
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

      // Emotion Facial Morph Targets
      if (vrm.expressionManager) {
        const targetExpr = EMOTION_EXPRESSIONS[emotion] || EMOTION_EXPRESSIONS.warm;
        const happyVal = vrm.expressionManager.getValue('happy') || 0;
        const relaxedVal = vrm.expressionManager.getValue('relaxed') || 0;
        const surprisedVal = vrm.expressionManager.getValue('surprised') || 0;
        
        vrm.expressionManager.setValue('happy', THREE.MathUtils.lerp(happyVal, targetExpr.happy, safeDelta * 3));
        vrm.expressionManager.setValue('relaxed', THREE.MathUtils.lerp(relaxedVal, targetExpr.relaxed, safeDelta * 3));
        vrm.expressionManager.setValue('surprised', THREE.MathUtils.lerp(surprisedVal, targetExpr.surprised, safeDelta * 3));

        // Lip Sync (Visemes) with zero allocation
        for (let i = 0; i < VISEMES.length; i++) {
          const v = VISEMES[i];
          const currentWeight = vrm.expressionManager.getValue(v) || 0;
          const targetWeight = currentViseme.current === v ? 1 : 0;
          if (Math.abs(currentWeight - targetWeight) > 0.01) {
            vrm.expressionManager.setValue(v, THREE.MathUtils.lerp(currentWeight, targetWeight, safeDelta * 16));
          }
        }
      }
      
      // Update animation mixer and secondary spring bone physics
      if (mixer.current) {
        mixer.current.update(safeDelta);
      }
      
      vrm.update(safeDelta);
    }
  });

  if (!vrm) return null;

  return <primitive object={vrm.scene} position={[0, 0, 0]} />;
}

// Stylized, branded avatar loading skeleton
const StageLoader = memo(({ progress, accentColor, isInitial }: { progress: number; accentColor: string; isInitial: boolean }) => {
  const safePercent = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 transition-opacity duration-700">
      <div className="relative flex flex-col items-center justify-center">
        {/* Glowing Aura Rings */}
        <div 
          className="absolute w-52 h-52 rounded-full blur-[50px] opacity-25 animate-pulse"
          style={{ backgroundColor: accentColor }}
        />
        
        {/* Avatar Silhouette Skeleton */}
        <div className="relative w-28 h-28 mb-6 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full text-white/[0.08]" fill="none" stroke="currentColor" strokeWidth="1.5">
            {/* Outer stylized orbit */}
            <circle cx="50" cy="50" r="46" strokeDasharray="6 6" className="animate-[spin_12s_linear_infinite]" />
            {/* Head outline */}
            <circle cx="50" cy="36" r="16" stroke={accentColor} strokeWidth="1.8" strokeOpacity="0.4" />
            {/* Torso & Shoulder arc */}
            <path d="M22 82 C24 58, 40 54, 50 54 C60 54, 76 58, 78 82" stroke={accentColor} strokeWidth="1.8" strokeOpacity="0.4" strokeLinecap="round" />
            {/* Core Neural Sparkle */}
            <circle cx="50" cy="36" r="3" fill={accentColor} className="animate-ping opacity-75" />
          </svg>
        </div>

        {/* Branded Loading Badge */}
        <div className="flex flex-col items-center gap-2.5 bg-black/75 backdrop-blur-xl border border-white/10 px-6 py-3.5 rounded-2xl shadow-2xl">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ color: accentColor }} />
            <span className="font-display text-xs font-semibold tracking-wider text-gray-200 uppercase">
              {isInitial ? 'Connecting with Lyra' : 'Adapting Presence'}
            </span>
            <span className="font-mono text-xs font-bold" style={{ color: accentColor }}>
              {safePercent}%
            </span>
          </div>

          {/* Progress Bar Track */}
          <div className="w-40 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-150 ease-out"
              style={{ 
                width: `${safePercent}%`, 
                backgroundColor: accentColor,
                boxShadow: `0 0 10px ${accentColor}`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default function CompanionStage({ 
  accentColor = "#FF8FC0", 
  isCallMode = false, 
  scenery = 'neutral', 
  outfitUrl = '/models/lyra.vrm',
  emotion = 'warm',
  onModelLoaded
}: { 
  accentColor?: string; 
  isCallMode?: boolean; 
  scenery?: string; 
  outfitUrl?: string;
  emotion?: string;
  onModelLoaded?: () => void;
}) {
  const { showError } = useToast();
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasEverLoaded, setHasEverLoaded] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const handleProgress = (percent: number) => {
    setLoadProgress(percent);
  };

  const handleLoaded = () => {
    setIsLoaded(true);
    setHasEverLoaded(true);
    if (onModelLoaded) {
      onModelLoaded();
    }
  };

  const handleRetry = () => {
    setIsLoaded(false);
    setLoadProgress(0);
    setRetryKey(prev => prev + 1);
  };

  const handleError = (errorMsg: string) => {
    setIsLoaded(false);
    console.error('[CompanionStage] VRM load error:', errorMsg);
    showError("Having trouble loading her right now, refreshing usually fixes it", {
      label: "Retry",
      onClick: () => handleRetry()
    });
  };

  useEffect(() => {
    setIsLoaded(false);
    setLoadProgress(0);
  }, [outfitUrl]);

  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center select-none bg-[var(--bg-base)]">
      {/* Unified Background Atmosphere */}
      <div className="absolute inset-0 transition-colors duration-1000 bg-[var(--bg-base)]" />
      
      {/* Subtle Warm Pink & Peach Ambient Glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[var(--accent-primary)]/10 via-[var(--accent-secondary)]/10 to-[#FFD1B3]/10 opacity-80 blur-[130px] rounded-full pointer-events-none transition-all duration-1000"
      />

      {/* Loading Skeleton / Progress Overlay */}
      <AnimatePresence>
        {!isLoaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--bg-base)]/80 backdrop-blur-md"
          >
            <StageLoader progress={loadProgress} accentColor={accentColor || "#FF8FC0"} isInitial={!hasEverLoaded} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* R3F WebGL 3D Canvas */}
      <div className="relative z-10 w-full h-full">
        <Canvas 
          camera={{ fov: 45 }} 
          gl={{ 
            alpha: true, 
            antialias: true, 
            powerPreference: "high-performance",
            stencil: false,
            depth: true
          }}
          dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5)]}
        >
          <CameraSetup isCallMode={isCallMode} />
          
          <AnimatedLighting scenery={scenery} accentColor={accentColor} />
          
          {/* Scenery assets lazy loaded on demand */}
          {scenery === 'night' && <Starfield />}

          <Suspense fallback={null}>
            <VRMModel 
              url={outfitUrl} 
              emotion={emotion}
              onProgress={handleProgress} 
              onLoaded={handleLoaded} 
              onError={handleError}
              retryKey={retryKey}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
