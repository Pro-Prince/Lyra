import { VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';

export function applyRelaxedHandPose(vrm: VRM, side: 'left' | 'right') {
  const h = vrm.humanoid;
  if (!h) return;
  const fingers = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'];
  const segments = ['Proximal', 'Intermediate', 'Distal'];
  const curlAmounts = [0.15, 0.25, 0.2]; // proximal, intermediate, distal, radians

  fingers.forEach((finger) => {
    segments.forEach((segment, i) => {
      const boneName = `${side}${finger}${segment}` as any;
      const bone = h.getNormalizedBoneNode(boneName);
      if (bone) {
        bone.rotation.z = side === 'left' ? curlAmounts[i] : -curlAmounts[i];
      }
    });
  });
}

export function applyRestPose(vrm: VRM) {
  console.log('applying rest pose to', vrm);
  const h = vrm.humanoid;
  if (!h) {
    console.warn('[applyRestPose] No humanoid found on VRM');
    return;
  }
  const leftUpperArm = h.getNormalizedBoneNode('leftUpperArm');
  const rightUpperArm = h.getNormalizedBoneNode('rightUpperArm');
  const leftLowerArm = h.getNormalizedBoneNode('leftLowerArm');
  const rightLowerArm = h.getNormalizedBoneNode('rightLowerArm');

  console.log('[applyRestPose] normalized leftUpperArm node:', leftUpperArm ? leftUpperArm.name : 'null');
  console.log('[applyRestPose] arm rotation BEFORE:', {
    leftUpperArmZ: leftUpperArm?.rotation.z,
    rightUpperArmZ: rightUpperArm?.rotation.z,
    leftLowerArmY: leftLowerArm?.rotation.y,
    rightLowerArmY: rightLowerArm?.rotation.y,
  });

  if (leftUpperArm) leftUpperArm.rotation.z = 1.15;
  if (rightUpperArm) rightUpperArm.rotation.z = -1.15;
  if (leftLowerArm) leftLowerArm.rotation.y = -0.15;
  if (rightLowerArm) rightLowerArm.rotation.y = 0.15;

  applyRelaxedHandPose(vrm, 'left');
  applyRelaxedHandPose(vrm, 'right');

  h.update();

  console.log('[applyRestPose] arm rotation AFTER:', {
    leftUpperArmZ: leftUpperArm?.rotation.z,
    rightUpperArmZ: rightUpperArm?.rotation.z,
    leftLowerArmY: leftLowerArm?.rotation.y,
    rightLowerArmY: rightLowerArm?.rotation.y,
  });
}

export function frameFullBody(
  vrmScene: THREE.Group,
  camera: THREE.PerspectiveCamera,
  canvasHeightPx: number = 256,
  reservedBottomPx: number = 0,
  reservedTopPx: number = 0
) {
  const box = new THREE.Box3().setFromObject(vrmScene);
  const size = new THREE.Vector3();
  box.getSize(size);

  const fov = camera.fov * (Math.PI / 180);
  const paddingFactor = 1.15;
  const visibleFraction = Math.max(0.1, (canvasHeightPx - reservedBottomPx - reservedTopPx) / canvasHeightPx);
  const distance = (size.y * paddingFactor) / (2 * Math.tan(fov / 2) * visibleFraction);

  const targetDist = Math.max(1.5, Math.min(4.0, distance));
  const posY = size.y * 0.5;
  camera.position.set(0, posY, targetDist);
  const verticalShift = (reservedBottomPx / canvasHeightPx) * size.y * 0.3;
  camera.lookAt(0, posY - verticalShift, 0);
}

export function framePortrait(
  vrmScene: THREE.Group,
  camera: THREE.PerspectiveCamera,
  canvasHeightPx: number = 256
) {
  const box = new THREE.Box3().setFromObject(vrmScene);
  const headTop = box.max.y;
  const shoulderY = headTop - (box.max.y - box.min.y) * 0.25; // roughly shoulders to head top
  const targetHeight = headTop - shoulderY;
  const paddingFactor = 1.4; // real headroom above her head, this is what was missing
  const fov = camera.fov * (Math.PI / 180);
  const distance = (targetHeight * paddingFactor) / (2 * Math.tan(fov / 2));
  camera.position.set(0, (headTop + shoulderY) / 2, distance);
  camera.lookAt(0, (headTop + shoulderY) / 2, 0);
}


