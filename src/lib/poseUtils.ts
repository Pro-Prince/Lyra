import { VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { safeUpdateMatrixWorld } from './companionRenderer';

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
  const h = vrm.humanoid;
  if (!h) {
    console.warn('[applyRestPose] No humanoid found on VRM');
    return;
  }
  const leftUpperArm = h.getNormalizedBoneNode('leftUpperArm');
  const rightUpperArm = h.getNormalizedBoneNode('rightUpperArm');

  const leftLowerArm = h.getNormalizedBoneNode('leftLowerArm');
  const rightLowerArm = h.getNormalizedBoneNode('rightLowerArm');

  if (leftUpperArm) leftUpperArm.rotation.z = -1.15;
  if (rightUpperArm) rightUpperArm.rotation.z = 1.15;
  if (leftLowerArm) leftLowerArm.rotation.y = -0.15;
  if (rightLowerArm) rightLowerArm.rotation.y = 0.15;

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
  const box = new THREE.Box3().setFromObject(vrmScene);
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
  const box = new THREE.Box3().setFromObject(vrmScene);
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
  const box = new THREE.Box3().setFromObject(vrmScene);
  const headTop = box.max.y;
  const shoulderY = headTop - (box.max.y - box.min.y) * 0.28;
  const targetHeight = headTop - shoulderY;
  const paddingFactor = 1.35;
  const fov = camera.fov * (Math.PI / 180);
  const distance = (targetHeight * paddingFactor) / (2 * Math.tan(fov / 2));
  camera.position.set(0, (headTop + shoulderY) / 2, Math.max(0.6, distance));
  camera.lookAt(0, (headTop + shoulderY) / 2, 0);
}


