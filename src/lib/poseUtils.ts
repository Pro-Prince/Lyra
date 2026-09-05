import { VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { safeUpdateMatrixWorld, safeSetFromObject } from './companionRenderer';

export const HUMAN_REST_EULERS = {
  leftShoulder: new THREE.Euler(-0.02, 0, -0.04),
  rightShoulder: new THREE.Euler(-0.02, 0, 0.04),
  leftUpperArm: new THREE.Euler(0.12, 0.06, -1.28),
  rightUpperArm: new THREE.Euler(0.12, -0.06, 1.28),
  leftLowerArm: new THREE.Euler(0.34, -0.12, 0.04),
  rightLowerArm: new THREE.Euler(0.34, 0.12, -0.04),
  leftHand: new THREE.Euler(0.08, 0.06, 0.05),
  rightHand: new THREE.Euler(0.08, -0.06, -0.05),
  spine: new THREE.Euler(0.02, 0, 0),
  chest: new THREE.Euler(-0.025, 0, 0),
  upperChest: new THREE.Euler(-0.015, 0, 0),
  neck: new THREE.Euler(0.01, 0, 0),
  head: new THREE.Euler(0.02, 0, 0),
};

export function applyRelaxedHandPose(vrm: VRM, side: 'left' | 'right') {
  const h = vrm.humanoid;
  if (!h) return;

  const isLeft = side === 'left';
  const sign = isLeft ? 1 : -1;

  // 1. Wrist (Hand bone)
  const handBone = h.getNormalizedBoneNode(`${side}Hand` as any);
  if (handBone) {
    handBone.rotation.set(0.08, 0.06 * sign, 0.05 * sign);
  }

  // 2. Natural finger curl parameters for human anatomy
  // Pinky and Ring curl deeper at rest than Index and Middle; fingers splay gently toward palm center
  const fingerCurvature: Record<string, { x: [number, number, number]; y: number; z: number }> = {
    Index: { x: [0.26, 0.38, 0.24], y: 0.04 * sign, z: 0.03 * sign },
    Middle: { x: [0.32, 0.48, 0.30], y: 0, z: 0 },
    Ring: { x: [0.40, 0.58, 0.34], y: -0.03 * sign, z: -0.02 * sign },
    Little: { x: [0.46, 0.66, 0.38], y: -0.06 * sign, z: -0.04 * sign },
  };

  const segments = ['Proximal', 'Intermediate', 'Distal'];

  Object.entries(fingerCurvature).forEach(([finger, config]) => {
    segments.forEach((segment, i) => {
      const boneName = `${side}${finger}${segment}` as any;
      const bone = h.getNormalizedBoneNode(boneName);
      if (bone) {
        const curlX = config.x[i];
        // Primary curl is local X, with slight lateral fan on proximal joint
        if (i === 0) {
          bone.rotation.set(curlX, config.y, config.z);
        } else {
          bone.rotation.set(curlX, 0, 0);
        }
      }
    });
  });

  // 3. Thumb opposition and gentle resting flex
  const thumbProximal = h.getNormalizedBoneNode(`${side}ThumbProximal` as any);
  const thumbIntermediate = h.getNormalizedBoneNode(`${side}ThumbIntermediate` as any);
  const thumbDistal = h.getNormalizedBoneNode(`${side}ThumbDistal` as any);

  if (thumbProximal) {
    thumbProximal.rotation.set(0.22, 0.25 * sign, -0.30 * sign);
  }
  if (thumbIntermediate) {
    thumbIntermediate.rotation.set(0.18, 0.08 * sign, -0.15 * sign);
  }
  if (thumbDistal) {
    thumbDistal.rotation.set(0.20, 0, -0.10 * sign);
  }
}

export function applyRestPose(vrm: VRM) {
  const h = vrm.humanoid;
  if (!h) {
    console.warn('[applyRestPose] No humanoid found on VRM');
    return;
  }

  const leftShoulder = h.getNormalizedBoneNode('leftShoulder');
  const rightShoulder = h.getNormalizedBoneNode('rightShoulder');
  const leftUpperArm = h.getNormalizedBoneNode('leftUpperArm');
  const rightUpperArm = h.getNormalizedBoneNode('rightUpperArm');
  const leftLowerArm = h.getNormalizedBoneNode('leftLowerArm');
  const rightLowerArm = h.getNormalizedBoneNode('rightLowerArm');
  const spine = h.getNormalizedBoneNode('spine');
  const chest = h.getNormalizedBoneNode('chest');
  const upperChest = h.getNormalizedBoneNode('upperChest');
  const neck = h.getNormalizedBoneNode('neck');
  const head = h.getNormalizedBoneNode('head');

  if (leftShoulder) leftShoulder.rotation.copy(HUMAN_REST_EULERS.leftShoulder);
  if (rightShoulder) rightShoulder.rotation.copy(HUMAN_REST_EULERS.rightShoulder);
  if (leftUpperArm) leftUpperArm.rotation.copy(HUMAN_REST_EULERS.leftUpperArm);
  if (rightUpperArm) rightUpperArm.rotation.copy(HUMAN_REST_EULERS.rightUpperArm);
  if (leftLowerArm) leftLowerArm.rotation.copy(HUMAN_REST_EULERS.leftLowerArm);
  if (rightLowerArm) rightLowerArm.rotation.copy(HUMAN_REST_EULERS.rightLowerArm);
  if (spine) spine.rotation.copy(HUMAN_REST_EULERS.spine);
  if (chest) chest.rotation.copy(HUMAN_REST_EULERS.chest);
  if (upperChest) upperChest.rotation.copy(HUMAN_REST_EULERS.upperChest);
  if (neck) neck.rotation.copy(HUMAN_REST_EULERS.neck);
  if (head) head.rotation.copy(HUMAN_REST_EULERS.head);

  applyRelaxedHandPose(vrm, 'left');
  applyRelaxedHandPose(vrm, 'right');

  h.update();
}

export function frameOutfit(
  vrmScene: THREE.Group,
  camera: THREE.PerspectiveCamera,
  _canvasHeightPx: number = 256
) {
  safeUpdateMatrixWorld(vrmScene);
  const box = safeSetFromObject(new THREE.Box3(), vrmScene);
  const totalHeight = box.max.y - box.min.y;
  const topY = box.max.y + 0.05;
  const bottomY = box.min.y + totalHeight * 0.25; // From mid-thighs to head
  const targetHeight = topY - bottomY;
  const paddingFactor = 1.15;
  const fov = camera.fov * (Math.PI / 180);
  const distance = (targetHeight * paddingFactor) / (2 * Math.tan(fov / 2));
  const centerY = (topY + bottomY) / 2;
  camera.position.set(0, centerY, Math.max(1.2, distance));
  camera.lookAt(0, centerY, 0);
}

export function frameFullBody(
  vrmScene: THREE.Group,
  camera: THREE.PerspectiveCamera,
  canvasHeightPx: number = 256,
  reservedBottomPx: number = 0,
  reservedTopPx: number = 0
) {
  safeUpdateMatrixWorld(vrmScene);
  const box = safeSetFromObject(new THREE.Box3(), vrmScene);
  const size = new THREE.Vector3();
  box.getSize(size);

  const fov = camera.fov * (Math.PI / 180);
  const paddingFactor = 1.12;
  const visibleFraction = Math.max(0.1, (canvasHeightPx - reservedBottomPx - reservedTopPx) / canvasHeightPx);
  const distance = (size.y * paddingFactor) / (2 * Math.tan(fov / 2) * visibleFraction);

  const targetDist = Math.max(1.4, Math.min(4.0, distance));
  const posY = (box.min.y + box.max.y) / 2;
  camera.position.set(0, posY, targetDist);
  const verticalShift = (reservedBottomPx / canvasHeightPx) * size.y * 0.2;
  camera.lookAt(0, posY - verticalShift, 0);
}

export function framePortrait(
  vrmScene: THREE.Group,
  camera: THREE.PerspectiveCamera,
  _canvasHeightPx: number = 256
) {
  safeUpdateMatrixWorld(vrmScene);
  const box = safeSetFromObject(new THREE.Box3(), vrmScene);
  const headTop = box.max.y;
  const shoulderY = headTop - (box.max.y - box.min.y) * 0.28;
  const targetHeight = headTop - shoulderY;
  const paddingFactor = 1.35;
  const fov = camera.fov * (Math.PI / 180);
  const distance = (targetHeight * paddingFactor) / (2 * Math.tan(fov / 2));
  camera.position.set(0, (headTop + shoulderY) / 2, Math.max(0.6, distance));
  camera.lookAt(0, (headTop + shoulderY) / 2, 0);
}


