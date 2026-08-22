import { useEffect, useRef, useState, Suspense, memo, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../hooks/useToast';
import { fetchAndCacheVRMModel, clearCachedModelBuffer } from '../lib/vrmCache';

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
  calm: { happy: 0.2, relaxed: 0.75, surprised: 0.0, neutral: 0.3, sad: 0.0 }
};

function frameFullBody(vrmScene: THREE.Group, camera: THREE.PerspectiveCamera, canvasHeightPx: number, reservedBottomPx: number, reservedTopPx: number) {
  const box = new THREE.Box3().setFromObject(vrmScene);
  const size = new THREE.Vector3();
  box.getSize(size);

  const fov = camera.fov * (Math.PI / 180);
  const paddingFactor = 1.15; // small headroom above her head
  const visibleFraction = Math.max(0.1, (canvasHeightPx - reservedBottomPx - reservedTopPx) / canvasHeightPx);
  const distance = (size.y * paddingFactor) / (2 * Math.tan(fov / 2) * visibleFraction);

  const targetDist = Math.max(1.5, Math.min(4.0, distance));
  const posY = size.y * 0.5;
  camera.position.set(0, posY, targetDist);
  const verticalShift = (reservedBottomPx / canvasHeightPx) * size.y * 0.3;
  camera.lookAt(0, posY - verticalShift, 0);
}

function applyRestPose(vrm: VRM) {
  const h = vrm.humanoid;
  const leftUpperArm = h.getNormalizedBoneNode('leftUpperArm');
  const rightUpperArm = h.getNormalizedBoneNode('rightUpperArm');
  const leftLowerArm = h.getNormalizedBoneNode('leftLowerArm');
  const rightLowerArm = h.getNormalizedBoneNode('rightLowerArm');

  if (leftUpperArm) leftUpperArm.rotation.z = 1.15;
  if (rightUpperArm) rightUpperArm.rotation.z = -1.15;
  if (leftLowerArm) leftLowerArm.rotation.y = -0.15;
  if (rightLowerArm) rightLowerArm.rotation.y = 0.15;

  h.update();
}

const idleVariations = [
  { name: 'breatheOnly', weight: 55, duration: 4 },
  { name: 'weightShift', weight: 18, duration: 3 },
  { name: 'lookAround', weight: 17, duration: 2.5 },
  { name: 'fidget', weight: 10, duration: 2 },
];

function pickNextIdle() {
  const total = idleVariations.reduce((sum, v) => sum + v.weight, 0);
  let r = Math.random() * total;
  for (const v of idleVariations) {
    if (r < v.weight) return v;
    r -= v.weight;
  }
  return idleVariations[0];
}

interface CameraRigProps {
  mode: 'centered' | 'panned-left';
  vrmScene?: THREE.Group | null;
}

function CameraRig({ mode, vrmScene }: CameraRigProps) {
  const { camera, gl } = useThree();
  const target = useRef(new THREE.Vector3());
  const targetPos = useRef(new THREE.Vector3());

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

        if (mode === 'panned-left') {
          targetPos.current.set(-0.9, 1.3, 2.4);
          target.current.set(-0.4, 1.3, 0);
        } else if (vrmScene) {
          frameFullBody(vrmScene, perspCam, height, 120, 70);
        } else {
          targetPos.current.set(0, 1.3, 2.0);
          target.current.set(0, 1.3, 0);
        }
      }
    };

    const ro = new ResizeObserver(() => {
      updateCamera();
    });
    ro.observe(canvasContainer);
    updateCamera();

    return () => ro.disconnect();
  }, [camera, gl, mode, vrmScene]);

  useFrame((_, delta) => {
    const safeDelta = Math.min(delta, 0.05);
    camera.position.lerp(targetPos.current, safeDelta * 6);
    camera.lookAt(target.current);
  });
  return null;
}

const StandingSurface = memo(({ accentColor }: { accentColor: string }) => {
  const safeAccent = resolveHexColor(accentColor, "#FF8FC0");
  const ringRef = useRef<THREE.Mesh>(null);
  const ringInnerRef = useRef<THREE.Mesh>(null);

  const floorTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.50)');
    grad.addColorStop(0.2, 'rgba(255, 143, 192, 0.32)');
    grad.addColorStop(0.5, 'rgba(255, 143, 192, 0.12)');
    grad.addColorStop(0.8, 'rgba(255, 143, 192, 0.03)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.beginPath();
    ctx.arc(256, 256, 175, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)';
    ctx.lineWidth = 4;
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  const shadowTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.30)');
    grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    if (ringRef.current) {
      ringRef.current.rotation.z += Math.min(delta, 0.05) * 0.12;
    }
    if (ringInnerRef.current) {
      ringInnerRef.current.rotation.z -= Math.min(delta, 0.05) * 0.08;
      const scalePulse = 1 + Math.sin(time * 1.5) * 0.03;
      ringInnerRef.current.scale.set(scalePulse, scalePulse, 1);
    }
  });

  return (
    <group position={[0, -0.005, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshBasicMaterial map={shadowTexture} transparent opacity={0.75} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[4.2, 4.2]} />
        <meshBasicMaterial map={floorTexture} transparent opacity={0.85} depthWrite={false} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[1.2, 1.23, 64]} />
        <meshBasicMaterial color={safeAccent} transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={ringInnerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0015, 0]}>
        <ringGeometry args={[0.7, 0.72, 48]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
});

function Starfield() {
  const pointsRef = useRef<THREE.Points>(null);
  const [geometry] = useState(() => {
    const geo = new THREE.BufferGeometry();
    const count = 250;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = Math.random() * 5 + 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  });

  useFrame((_, delta) => {
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

  useFrame((_, delta) => {
    const safeDelta = Math.min(delta, 0.05);
    const lerpSpeed = safeDelta * 4;

    SCRATCH_COLOR_A.set("#FFEBF4");
    let targetAmbientIntensity = 0.7;
    
    SCRATCH_COLOR_B.set("#FFF5F8");
    let targetKeyIntensity = 1.05;
    
    SCRATCH_COLOR_C.set(safeAccent || "#FF8FC0");
    let targetFillIntensity = 0.6;
    const targetFillPos = new THREE.Vector3(-2, 1, 3);

    if (scenery === 'cozy') {
      SCRATCH_COLOR_A.set("#FFF0E6");
      targetAmbientIntensity = 0.65;
      targetKeyIntensity = 0.95;
      targetFillIntensity = 0.5;
    } else if (scenery === 'dusk') {
      SCRATCH_COLOR_A.set("#F4E8FF");
      targetAmbientIntensity = 0.55;
      targetKeyIntensity = 0.85;
      targetFillIntensity = 0.55;
      targetFillPos.set(-2, 1.2, 2);
    } else if (scenery === 'night') {
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
      fillRef.current.position.lerp(targetFillPos, lerpSpeed);
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
  onLoaded?: (scene: THREE.Group) => void;
  onError?: (error: string) => void;
  retryKey?: number;
}

function VRMModel({ url, emotion = 'warm', onProgress, onLoaded, onError, retryKey = 0 }: VRMModelProps) {
  const [vrm, setVrm] = useState<VRM | null>(null);

  const lookTarget = useRef(new THREE.Object3D());
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const clips = useRef<Record<string, THREE.AnimationClip>>({});
  const currentAction = useRef<THREE.AnimationAction | null>(null);
  const targetLookAt = useRef(new THREE.Vector3(0, 1.35, 3));

  // Weighted idle system state
  const currentIdle = useRef(idleVariations[0]);
  const idleTimer = useRef(0);
  const idleBlend = useRef(0); // 400ms cross-fade

  useEffect(() => {
    let currentVrm: VRM | null = null;
    let isCancelled = false;
    const abortController = new AbortController();

    const timeoutId = setTimeout(() => {
      abortController.abort(new Error("Model download timed out."));
    }, 25000);

    const loadVRM = async () => {
      try {
        if (onProgress) onProgress(10);
        const arrayBuffer = await fetchAndCacheVRMModel(url, abortController.signal);
        if (onProgress) onProgress(95);

        clearTimeout(timeoutId);
        if (isCancelled || !arrayBuffer) return;

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
              if (onError) onError("File parsed as glTF, but contains no VRM humanoid metadata.");
              return;
            }

            VRMUtils.removeUnnecessaryVertices(gltf.scene);
            VRMUtils.combineSkeletons(gltf.scene);
            vrmInstance.scene.traverse((obj) => {
              obj.frustumCulled = false;
              if (obj instanceof THREE.Mesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
              }
            });

            // 1. Apply rest pose immediately before any frame is rendered
            applyRestPose(vrmInstance);

            // 2. Center & floor VRM
            const box = new THREE.Box3().setFromObject(vrmInstance.scene);
            const center = new THREE.Vector3();
            box.getCenter(center);
            vrmInstance.scene.position.x -= center.x;
            vrmInstance.scene.position.z -= center.z;
            vrmInstance.scene.position.y -= box.min.y;

            // Setup LookAt target
            lookTarget.current.position.set(0, 1.35, 3);
            vrmInstance.scene.add(lookTarget.current);
            if (vrmInstance.lookAt) {
              vrmInstance.lookAt.target = lookTarget.current;
            }

            mixer.current = new THREE.AnimationMixer(vrmInstance.scene);

            const head = vrmInstance.humanoid.getNormalizedBoneNode('head');
            const spine = vrmInstance.humanoid.getNormalizedBoneNode('spine');
            const upperArmR = vrmInstance.humanoid.getNormalizedBoneNode('rightUpperArm');
            const lowerArmR = vrmInstance.humanoid.getNormalizedBoneNode('rightLowerArm');

            const makeTrack = (node: THREE.Object3D | null, eulers: THREE.Euler[], times: number[]) => {
              if (!node) return null;
              const values = eulers.flatMap(e => new THREE.Quaternion().setFromEuler(e).toArray());
              return new THREE.QuaternionKeyframeTrack(node.name + '.quaternion', times, values);
            };

            const qZero = new THREE.Euler(0, 0, 0);

            if (upperArmR && lowerArmR) {
              const tWaveUp = makeTrack(upperArmR, [qZero, new THREE.Euler(0, 0, -Math.PI / 2.2), new THREE.Euler(0, 0, -Math.PI / 2.2), qZero], [0, 0.3, 1.7, 2.0]);
              const tWaveLow = makeTrack(lowerArmR, [qZero, qZero, new THREE.Euler(0, 0, -0.5), new THREE.Euler(0, 0, 0.5), new THREE.Euler(0, 0, -0.5), new THREE.Euler(0, 0, 0.5), new THREE.Euler(0, 0, 0), qZero], [0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.7, 2.0]);
              if (tWaveUp && tWaveLow) clips.current['wave'] = new THREE.AnimationClip('wave', 2.0, [tWaveUp, tWaveLow]);
            }

            if (head) {
              const tNod = makeTrack(head, [qZero, new THREE.Euler(0.15, 0, 0), new THREE.Euler(0.15, 0, 0), qZero], [0, 0.2, 0.4, 0.6]);
              if (tNod) clips.current['nod'] = new THREE.AnimationClip('nod', 0.6, [tNod]);

              const tThink = makeTrack(head, [qZero, new THREE.Euler(0.1, -0.15, 0.1), qZero], [0, 0.5, 1.0]);
              if (tThink) clips.current['think'] = new THREE.AnimationClip('think', 1.0, [tThink]);
            }

            const playGesture = (name: string) => {
              if (!mixer.current || !clips.current[name]) return;
              const clip = clips.current[name];
              const action = mixer.current.clipAction(clip);
              if (currentAction.current && currentAction.current !== action) {
                currentAction.current.crossFadeTo(action, 0.2, false);
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
                  if (currentAction.current === action) currentAction.current = null;
                }
              };
              mixer.current.addEventListener('finished', onFinished);
            };

            // @ts-ignore
            window.playGesture = playGesture;

            if (onProgress) onProgress(100);
            if (onLoaded) onLoaded(vrmInstance.scene);

            setVrm(vrmInstance);
            currentVrm = vrmInstance;
          },
          async (err) => {
            clearTimeout(timeoutId);
            await clearCachedModelBuffer(url);
            const msg = err instanceof Error ? err.message : String(err);
            if (onError) onError(`3D model parsing failed: ${msg}`);
          }
        );
      } catch (err: any) {
        clearTimeout(timeoutId);
        await clearCachedModelBuffer(url);
        if (isCancelled) return;
        if (onError) onError(err?.message || String(err));
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
            const mat = (child as THREE.Mesh).material;
            if (Array.isArray(mat)) mat.forEach(m => m.dispose());
            else if (mat) mat.dispose();
            if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
          }
        });
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

  useEffect(() => {
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

  const elapsedTimeRef = useRef(0);

  useFrame((_, delta) => {
    if (vrm) {
      const safeDelta = Math.min(delta, 0.04);
      elapsedTimeRef.current += safeDelta;
      const time = elapsedTimeRef.current;

      // Weighted Idle System progression
      idleTimer.current += safeDelta;
      if (idleTimer.current >= currentIdle.current.duration) {
        idleTimer.current = 0;
        currentIdle.current = pickNextIdle();
        idleBlend.current = 0; // trigger cross-fade
      }
      idleBlend.current = Math.min(1, idleBlend.current + safeDelta / 0.4); // 400ms crossfade

      // 1. Baseline Breathing
      const breathScale = 1 + Math.sin(time * (2 * Math.PI / 4)) * 0.006;
      vrm.scene.scale.set(breathScale, breathScale, breathScale);

      // 2. Weighted Idle Variations Layering
      const spine = vrm.humanoid.getNormalizedBoneNode('spine');
      const head = vrm.humanoid.getNormalizedBoneNode('head');

      if (spine && head) {
        if (currentIdle.current.name === 'breatheOnly') {
          spine.rotation.z = THREE.MathUtils.lerp(spine.rotation.z, Math.sin(time * 1.5) * 0.015, 0.1);
          head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, 0, 0.1);
        } else if (currentIdle.current.name === 'weightShift') {
          spine.rotation.z = THREE.MathUtils.lerp(spine.rotation.z, 0.03, 0.08);
          head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, -0.05, 0.08);
        } else if (currentIdle.current.name === 'lookAround') {
          head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, Math.sin(time * 2) * 0.12, 0.1);
          head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, 0.05, 0.1);
        } else if (currentIdle.current.name === 'fidget') {
          spine.rotation.y = THREE.MathUtils.lerp(spine.rotation.y, Math.cos(time * 3) * 0.02, 0.1);
          head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, 0.04, 0.1);
        }
      }

      // 3. Gaze tracking damping
      lookTarget.current.position.lerp(targetLookAt.current, 0.08);

      // Blink oscillator
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

      // Emotion & Lip Sync
      if (vrm.expressionManager) {
        const targetExpr = EMOTION_EXPRESSIONS[emotion] || EMOTION_EXPRESSIONS.warm;
        const happyVal = vrm.expressionManager.getValue('happy') || 0;
        const relaxedVal = vrm.expressionManager.getValue('relaxed') || 0;
        const surprisedVal = vrm.expressionManager.getValue('surprised') || 0;

        vrm.expressionManager.setValue('happy', THREE.MathUtils.lerp(happyVal, targetExpr.happy, safeDelta * 3));
        vrm.expressionManager.setValue('relaxed', THREE.MathUtils.lerp(relaxedVal, targetExpr.relaxed, safeDelta * 3));
        vrm.expressionManager.setValue('surprised', THREE.MathUtils.lerp(surprisedVal, targetExpr.surprised, safeDelta * 3));

        for (let i = 0; i < VISEMES.length; i++) {
          const v = VISEMES[i];
          const currentWeight = vrm.expressionManager.getValue(v) || 0;
          const targetWeight = currentViseme.current === v ? 1 : 0;
          if (Math.abs(currentWeight - targetWeight) > 0.01) {
            vrm.expressionManager.setValue(v, THREE.MathUtils.lerp(currentWeight, targetWeight, safeDelta * 16));
          }
        }
      }

      if (mixer.current) mixer.current.update(safeDelta);
      vrm.update(safeDelta);
    }
  });

  if (!vrm) return null;

  return <primitive object={vrm.scene} position={[0, 0, 0]} />;
}

export default function CompanionStage({
  isWardrobeOpen = false,
  accentColor = "#FF8FC0",
  scenery = 'neutral',
  outfitUrl = '/models/lyra.vrm',
  emotion = 'warm',
  graphicsTier = 'high',
  onModelLoaded
}: {
  accentColor?: string;
  isCallMode?: boolean;
  scenery?: string;
  outfitUrl?: string;
  emotion?: string;
  isWardrobeOpen?: boolean;
  graphicsTier?: 'low' | 'medium' | 'high';
  onModelLoaded?: () => void;
}) {
  const { showError } = useToast();
  const [isLoaded, setIsLoaded] = useState(false);
  const [vrmSceneRef, setVrmSceneRef] = useState<THREE.Group | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const handleRetry = () => {
    setIsLoaded(false);
    setVrmSceneRef(null);
    setRetryKey(prev => prev + 1);
  };

  const handleError = () => {
    setIsLoaded(false);
    showError("Having trouble loading her right now, refreshing usually fixes it", {
      label: "Retry",
      onClick: () => handleRetry()
    });
  };

  useEffect(() => {
    setIsLoaded(false);
    setVrmSceneRef(null);
  }, [outfitUrl]);

  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center select-none bg-[var(--bg-base)]">
      <div className="absolute inset-0 transition-colors duration-1000 bg-[var(--bg-base)]" />
      
      {/* While loading: show ONLY ambient presence glow from Fix 1, nothing else */}
      <AnimatePresence>
        {!isLoaded && (
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
          camera={{ position: [0, 1.3, 2.0], fov: 45 }} 
          gl={{ 
            alpha: true, 
            antialias: graphicsTier !== 'low', 
            powerPreference: "high-performance",
            stencil: false,
            depth: true
          }}
          dpr={
            graphicsTier === 'low' ? [0.5, 0.75] : 
            graphicsTier === 'medium' ? [1, 1] : 
            [1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)]
          }
        >
          <CameraRig mode={isWardrobeOpen ? 'panned-left' : 'centered'} vrmScene={vrmSceneRef} />
          <AnimatedLighting scenery={scenery} accentColor={accentColor} />
          
          {scenery === 'night' && <Starfield />}
          <StandingSurface accentColor={accentColor} />

          <Suspense fallback={null}>
            <VRMModel 
              url={outfitUrl} 
              emotion={emotion}
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
