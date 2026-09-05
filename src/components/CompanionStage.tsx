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
import { loadCompanionModel, safeUpdateMatrixWorld, safeSetFromObject, safeUpdateVRM } from '../lib/companionRenderer';
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

import { HUMAN_REST_EULERS } from '../lib/poseUtils';

function createGestureClips(vrm: VRM): Record<string, THREE.AnimationClip> {
  const h = vrm.humanoid;
  if (!h) return {};

  const head = h.getNormalizedBoneNode('head');
  const neck = h.getNormalizedBoneNode('neck');
  const spine = h.getNormalizedBoneNode('spine');
  const chest = h.getNormalizedBoneNode('chest');
  const upperChest = h.getNormalizedBoneNode('upperChest');
  const leftShoulder = h.getNormalizedBoneNode('leftShoulder');
  const rightShoulder = h.getNormalizedBoneNode('rightShoulder');
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

  const R = HUMAN_REST_EULERS;
  const gestureClips: Record<string, THREE.AnimationClip> = {};

  // 1. WAVE (2.2s) - Natural, warm human wave with soft elbow and wrist lag
  const waveTracks: (THREE.QuaternionKeyframeTrack | null)[] = [
    makeTrack(rightShoulder, [
      R.rightShoulder,
      new THREE.Euler(-0.04, 0, 0.08),
      new THREE.Euler(-0.04, 0, 0.08),
      R.rightShoulder
    ], [0, 0.4, 1.8, 2.2]),
    makeTrack(upperArmR, [
      R.rightUpperArm,
      new THREE.Euler(0.25, 0.10, -0.65), // smooth natural raise
      new THREE.Euler(0.25, 0.10, -0.65),
      R.rightUpperArm
    ], [0, 0.4, 1.8, 2.2]),
    makeTrack(lowerArmR, [
      R.rightLowerArm,
      new THREE.Euler(0.95, 0.25, -0.25),
      new THREE.Euler(0.95, 0.10, -0.45),
      new THREE.Euler(0.95, 0.35, -0.15),
      new THREE.Euler(0.95, 0.10, -0.45),
      new THREE.Euler(0.95, 0.35, -0.15),
      new THREE.Euler(0.95, 0.25, -0.25),
      R.rightLowerArm
    ], [0, 0.4, 0.7, 1.0, 1.3, 1.6, 1.8, 2.2]),
    makeTrack(handR, [
      R.rightHand,
      new THREE.Euler(0.10, -0.15, -0.10),
      new THREE.Euler(0.12, 0.20, 0.15),
      new THREE.Euler(0.08, -0.20, -0.15),
      new THREE.Euler(0.12, 0.20, 0.15),
      new THREE.Euler(0.08, -0.20, -0.15),
      new THREE.Euler(0.10, 0.00, 0.00),
      R.rightHand
    ], [0, 0.4, 0.75, 1.05, 1.35, 1.65, 1.85, 2.2]),
    makeTrack(head, [
      R.head,
      new THREE.Euler(0.04, -0.08, -0.06),
      new THREE.Euler(0.04, -0.08, -0.06),
      R.head
    ], [0, 0.4, 1.8, 2.2]),
    makeTrack(chest, [
      R.chest,
      new THREE.Euler(-0.04, -0.02, -0.02),
      new THREE.Euler(-0.04, -0.02, -0.02),
      R.chest
    ], [0, 0.4, 1.8, 2.2])
  ];
  const validWave = waveTracks.filter((t): t is THREE.QuaternionKeyframeTrack => t !== null);
  if (validWave.length > 0) gestureClips['wave'] = new THREE.AnimationClip('wave', 2.2, validWave);

  // 2. NOD (1.1s) - Human acknowledgment with natural deceleration and follow-through
  const nodTracks: (THREE.QuaternionKeyframeTrack | null)[] = [
    makeTrack(head, [
      R.head,
      new THREE.Euler(0.24, 0, 0),
      new THREE.Euler(-0.04, 0, 0),
      new THREE.Euler(0.12, 0, 0),
      R.head
    ], [0, 0.32, 0.58, 0.84, 1.1]),
    makeTrack(neck, [
      R.neck,
      new THREE.Euler(0.09, 0, 0),
      new THREE.Euler(-0.02, 0, 0),
      new THREE.Euler(0.05, 0, 0),
      R.neck
    ], [0, 0.32, 0.58, 0.84, 1.1]),
    makeTrack(chest, [
      R.chest,
      new THREE.Euler(-0.035, 0, 0),
      R.chest,
      new THREE.Euler(-0.03, 0, 0),
      R.chest
    ], [0, 0.32, 0.58, 0.84, 1.1])
  ];
  const validNod = nodTracks.filter((t): t is THREE.QuaternionKeyframeTrack => t !== null);
  if (validNod.length > 0) gestureClips['nod'] = new THREE.AnimationClip('nod', 1.1, validNod);

  // 3. LAUGH (1.6s) - Rhythmic torso bounce, polite hand gesture, playful head tilt
  const laughTracks: (THREE.QuaternionKeyframeTrack | null)[] = [
    makeTrack(head, [
      R.head,
      new THREE.Euler(-0.14, 0.05, 0.04),
      new THREE.Euler(0.03, -0.02, 0),
      new THREE.Euler(-0.10, 0.04, 0.03),
      new THREE.Euler(0.01, 0, 0),
      R.head
    ], [0, 0.35, 0.7, 1.05, 1.35, 1.6]),
    makeTrack(chest, [
      R.chest,
      new THREE.Euler(0.04, 0, 0),
      new THREE.Euler(-0.035, 0, 0),
      new THREE.Euler(0.03, 0, 0),
      new THREE.Euler(-0.03, 0, 0),
      R.chest
    ], [0, 0.35, 0.7, 1.05, 1.35, 1.6]),
    makeTrack(spine, [
      R.spine,
      new THREE.Euler(-0.02, 0.01, 0.01),
      new THREE.Euler(0.02, 0, 0),
      new THREE.Euler(-0.015, 0.01, 0.01),
      R.spine
    ], [0, 0.35, 0.7, 1.05, 1.6]),
    makeTrack(upperArmR, [
      R.rightUpperArm,
      new THREE.Euler(0.35, 0.05, 0.95),
      new THREE.Euler(0.35, 0.05, 0.95),
      R.rightUpperArm
    ], [0, 0.35, 1.25, 1.6]),
    makeTrack(lowerArmR, [
      R.rightLowerArm,
      new THREE.Euler(0.75, 0.15, 0.10),
      new THREE.Euler(0.75, 0.15, 0.10),
      R.rightLowerArm
    ], [0, 0.35, 1.25, 1.6])
  ];
  const validLaugh = laughTracks.filter((t): t is THREE.QuaternionKeyframeTrack => t !== null);
  if (validLaugh.length > 0) gestureClips['laugh'] = new THREE.AnimationClip('laugh', 1.6, validLaugh);

  // 4. THINK (2.0s) - Right hand softly at chin, curious head tilt
  const thinkTracks: (THREE.QuaternionKeyframeTrack | null)[] = [
    makeTrack(head, [
      R.head,
      new THREE.Euler(0.08, -0.18, 0.12),
      new THREE.Euler(0.08, -0.18, 0.12),
      R.head
    ], [0, 0.45, 1.55, 2.0]),
    makeTrack(upperArmR, [
      R.rightUpperArm,
      new THREE.Euler(0.38, 0.12, 0.65),
      new THREE.Euler(0.38, 0.12, 0.65),
      R.rightUpperArm
    ], [0, 0.45, 1.55, 2.0]),
    makeTrack(lowerArmR, [
      R.rightLowerArm,
      new THREE.Euler(1.10, 0.20, 0.15),
      new THREE.Euler(1.10, 0.20, 0.15),
      R.rightLowerArm
    ], [0, 0.45, 1.55, 2.0]),
    makeTrack(handR, [
      R.rightHand,
      new THREE.Euler(0.18, 0.10, 0.08),
      new THREE.Euler(0.18, 0.10, 0.08),
      R.rightHand
    ], [0, 0.45, 1.55, 2.0]),
    makeTrack(chest, [
      R.chest,
      new THREE.Euler(-0.03, -0.04, 0.02),
      new THREE.Euler(-0.03, -0.04, 0.02),
      R.chest
    ], [0, 0.45, 1.55, 2.0])
  ];
  const validThink = thinkTracks.filter((t): t is THREE.QuaternionKeyframeTrack => t !== null);
  if (validThink.length > 0) gestureClips['think'] = new THREE.AnimationClip('think', 2.0, validThink);

  // 5. CHEER (2.0s) - Joyous raised curved arms, lifted chest, bright head position
  const cheerTracks: (THREE.QuaternionKeyframeTrack | null)[] = [
    makeTrack(upperArmL, [
      R.leftUpperArm,
      new THREE.Euler(0.35, 0.10, -0.45),
      new THREE.Euler(0.38, 0.10, -0.48),
      new THREE.Euler(0.35, 0.10, -0.45),
      R.leftUpperArm
    ], [0, 0.45, 0.95, 1.45, 2.0]),
    makeTrack(upperArmR, [
      R.rightUpperArm,
      new THREE.Euler(0.35, -0.10, 0.45),
      new THREE.Euler(0.38, -0.10, 0.48),
      new THREE.Euler(0.35, -0.10, 0.45),
      R.rightUpperArm
    ], [0, 0.45, 0.95, 1.45, 2.0]),
    makeTrack(lowerArmL, [
      R.leftLowerArm,
      new THREE.Euler(0.70, 0.10, 0.25),
      new THREE.Euler(0.75, 0.12, 0.28),
      new THREE.Euler(0.70, 0.10, 0.25),
      R.leftLowerArm
    ], [0, 0.45, 0.95, 1.45, 2.0]),
    makeTrack(lowerArmR, [
      R.rightLowerArm,
      new THREE.Euler(0.70, -0.10, -0.25),
      new THREE.Euler(0.75, -0.12, -0.28),
      new THREE.Euler(0.70, -0.10, -0.25),
      R.rightLowerArm
    ], [0, 0.45, 0.95, 1.45, 2.0]),
    makeTrack(chest, [
      R.chest,
      new THREE.Euler(-0.065, 0, 0),
      new THREE.Euler(-0.08, 0, 0),
      new THREE.Euler(-0.065, 0, 0),
      R.chest
    ], [0, 0.45, 0.95, 1.45, 2.0]),
    makeTrack(head, [
      R.head,
      new THREE.Euler(-0.12, 0, 0),
      new THREE.Euler(-0.15, 0, 0),
      new THREE.Euler(-0.12, 0, 0),
      R.head
    ], [0, 0.45, 0.95, 1.45, 2.0])
  ];
  const validCheer = cheerTracks.filter((t): t is THREE.QuaternionKeyframeTrack => t !== null);
  if (validCheer.length > 0) gestureClips['cheer'] = new THREE.AnimationClip('cheer', 2.0, validCheer);

  // 6. PROCEDURAL IDLE (4.0s loop) - Lifelike organic breathing & subtle weight shifts
  const idleTracks: (THREE.QuaternionKeyframeTrack | null)[] = [
    makeTrack(chest, [
      R.chest,
      new THREE.Euler(-0.045, 0.005, 0),
      R.chest,
      new THREE.Euler(-0.015, -0.005, 0),
      R.chest
    ], [0, 1.0, 2.0, 3.0, 4.0]),
    makeTrack(spine, [
      R.spine,
      new THREE.Euler(0.025, 0.008, 0.003),
      R.spine,
      new THREE.Euler(0.015, -0.008, -0.003),
      R.spine
    ], [0, 1.0, 2.0, 3.0, 4.0]),
    makeTrack(head, [
      R.head,
      new THREE.Euler(0.035, 0.012, 0.008),
      R.head,
      new THREE.Euler(0.010, -0.012, -0.008),
      R.head
    ], [0, 1.0, 2.0, 3.0, 4.0]),
    makeTrack(upperArmL, [
      R.leftUpperArm,
      new THREE.Euler(0.14, 0.07, -1.26),
      R.leftUpperArm,
      new THREE.Euler(0.10, 0.05, -1.30),
      R.leftUpperArm
    ], [0, 1.0, 2.0, 3.0, 4.0]),
    makeTrack(upperArmR, [
      R.rightUpperArm,
      new THREE.Euler(0.14, -0.07, 1.26),
      R.rightUpperArm,
      new THREE.Euler(0.10, -0.05, 1.30),
      R.rightUpperArm
    ], [0, 1.0, 2.0, 3.0, 4.0]),
    makeTrack(lowerArmL, [
      R.leftLowerArm,
      new THREE.Euler(0.36, -0.12, 0.04),
      R.leftLowerArm,
      new THREE.Euler(0.32, -0.12, 0.04),
      R.leftLowerArm
    ], [0, 1.0, 2.0, 3.0, 4.0]),
    makeTrack(lowerArmR, [
      R.rightLowerArm,
      new THREE.Euler(0.36, 0.12, -0.04),
      R.rightLowerArm,
      new THREE.Euler(0.32, 0.12, -0.04),
      R.rightLowerArm
    ], [0, 1.0, 2.0, 3.0, 4.0])
  ];
  const validIdle = idleTracks.filter((t): t is THREE.QuaternionKeyframeTrack => t !== null);
  if (validIdle.length > 0) gestureClips['procedural_idle'] = new THREE.AnimationClip('procedural_idle', 4.0, validIdle);

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
    safeUpdateMatrixWorld(vrmScene);
    const box = safeSetFromObject(new THREE.Box3(), vrmScene);
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
      targetPos.current.set(companionPosition.x + 0.4, Math.max(0.8, 1.75), companionPosition.z + 3.2);
      lookTarget.current.set(companionPosition.x + 0.1, 1.0, companionPosition.z);
    } else if (mode === 'panned-left') {
      targetPos.current.set(-0.9, Math.max(0.8, 1.3), 2.4);
      lookTarget.current.set(-0.4, 1.0, 0);
    } else {
      targetPos.current.set(0, Math.max(0.8, 1.3), 2.0);
      lookTarget.current.set(0, 1.0, 0);
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
  onReset?: () => void;
  onError?: (error: string) => void;
  retryKey?: number;
}

function VRMModel({ url, emotion = 'warm', isProcessing = false, onProgress, onLoaded, onReset, onError, retryKey = 0 }: VRMModelProps) {
  const { camera, gl } = useThree();
  const [vrm, setVrm] = useState<VRM | null>(null);

  const lookTarget = useRef(new THREE.Object3D());
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const clips = useRef<Record<string, THREE.AnimationClip>>({});
  const currentAction = useRef<THREE.AnimationAction | null>(null);
  const targetLookAt = useRef(new THREE.Vector3(0, 1.35, 3));

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

        // Apply rest pose
        applyRestPose(vrmInstance);

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
        if (vrmInstance.lookAt) {
          vrmInstance.lookAt.target = lookTarget.current;
        }

        mixer.current = new THREE.AnimationMixer(vrmInstance.scene);

        // Integrate generated tap gesture clips with loaded Mixamo clips
        const proceduralGestures = createGestureClips(vrmInstance);
        clips.current = {
          ...proceduralGestures,
          ...(cached?.clips || {})
        };

        handleOutfitsReady = () => {
          if (isCancelled) return;
          const freshCached = getCachedOutfit(url);
          if (freshCached?.clips) {
            clips.current = {
              ...clips.current,
              ...freshCached.clips,
            };
            if (!currentAction.current && clips.current['idle']) {
              playAction('idle', true);
            }
          }
        };
        window.addEventListener('lyraOutfitsReady', handleOutfitsReady);

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

        if (clips.current['idle']) {
          playAction('idle', true);
        } else if (clips.current['procedural_idle']) {
          playAction('procedural_idle', true);
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
      if (handleOutfitsReady) {
        window.removeEventListener('lyraOutfitsReady', handleOutfitsReady);
      }
      setVrm(null);
      if (onReset) onReset();
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
    if (!vrm || !vrm.scene || !vrm.scene.parent) return;
    
    try {
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

      safeUpdateVRM(vrm, safeDelta);
    } catch (frameErr) {
      console.warn('[CompanionStage useFrame] Handled frame update exception:', frameErr);
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
        {!isLoaded && !hasFailed && (
          <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
            <div className="presence-glow" />
          </div>
        )}
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
              <h3 className="text-base font-semibold text-white">Model File Not Found</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Could not load <code className="bg-black/50 px-1.5 py-0.5 rounded text-red-300 font-mono text-[11px]">{activeModelId}</code>. Please place your exported <code className="bg-black/50 px-1.5 py-0.5 rounded text-amber-300 font-mono text-[11px]">lyra.vrm</code> file into <code className="bg-black/50 px-1.5 py-0.5 rounded text-amber-300 font-mono text-[11px]">public/models/</code>.
              </p>
              <button
                onClick={() => {
                  retryCount.current = 0;
                  handleRetry();
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:brightness-110 text-white text-xs font-medium shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                Retry Loading Model
              </button>
            </div>
          </motion.div>
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
          id="companion-canvas-container"
          frameloop={isTabVisible ? "always" : "never"}
          camera={{ position: [0.4, 1.75, 3.2], fov: 32 }} 
          gl={{ 
            preserveDrawingBuffer: true,
            alpha: true, 
            antialias: true, 
            powerPreference: "default",
            stencil: false,
            depth: true,
            failIfMajorPerformanceCaveat: false
          }}
          onCreated={({ gl, size, gl: { domElement } }) => {
            domElement.id = 'companion-webgl-canvas';
            console.log('CompanionStage Canvas size at mount:', size.width, size.height);
            console.log('CompanionStage DOM Element size:', domElement.clientWidth, domElement.clientHeight);
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 0.95;
          }}
          dpr={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1}
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
              onReset={() => {
                setVrmSceneRef(null);
                setIsLoaded(false);
              }}
              onError={handleError}
              retryKey={retryKey}
            />
          </Suspense>
        </Canvas>
        
        {/* Cinematic Vignette Overlay */}
        <div className="pointer-events-none absolute inset-0 z-20" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.35) 100%)' }} />
      </motion.div>
    </div>
  );
}

const CompanionStage = memo(CompanionStageComponent);
export default CompanionStage;
