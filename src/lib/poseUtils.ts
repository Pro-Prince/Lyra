import { VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { safeUpdateMatrixWorld, safeSetFromObject } from './companionRenderer';

export const HUMAN_REST_EULERS = {
  leftShoulder: new THREE.Euler(0.01, 0.01, -0.02),
  rightShoulder: new THREE.Euler(0.01, -0.01, 0.02),
  // Upper arms hang down naturally at her sides with safe outward clearance (~14° outward)
  // preventing arms from clipping into skirts, dresses, coats, or thighs
  leftUpperArm: new THREE.Euler(0.06, 0.08, -1.32),
  rightUpperArm: new THREE.Euler(0.06, -0.08, 1.32),
  // Lower arms have a gentle natural flex at the elbow (~8-10° bend) hanging straight down beside her body
  leftLowerArm: new THREE.Euler(0.12, 0.12, -0.08),
  rightLowerArm: new THREE.Euler(0.12, -0.12, 0.08),
  // Hands hang naturally alongside hips/thighs, palms facing softly inward towards the thighs
  leftHand: new THREE.Euler(0.06, 0.10, -0.08),
  rightHand: new THREE.Euler(0.06, -0.10, 0.08),
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

  // 1. Wrist (Hand bone) - Oriented so hands hang naturally beside hips/thighs
  const handBone = h.getNormalizedBoneNode(`${side}Hand` as any);
  if (handBone) {
    if (isLeft) {
      handBone.rotation.copy(HUMAN_REST_EULERS.leftHand);
    } else {
      handBone.rotation.copy(HUMAN_REST_EULERS.rightHand);
    }
  }

  // 2. Natural relaxed finger curvature for hands resting beside thighs
  const fingerCurvature: Record<string, { x: [number, number, number]; y: number; z: number }> = isLeft
    ? {
        Index: { x: [0.18, 0.24, 0.16], y: 0.01, z: 0.01 },
        Middle: { x: [0.22, 0.28, 0.18], y: 0.0, z: 0.0 },
        Ring: { x: [0.25, 0.32, 0.20], y: -0.01, z: -0.01 },
        Little: { x: [0.28, 0.36, 0.22], y: -0.02, z: -0.02 },
      }
    : {
        Index: { x: [0.18, 0.24, 0.16], y: -0.01, z: -0.01 },
        Middle: { x: [0.22, 0.28, 0.18], y: 0.0, z: 0.0 },
        Ring: { x: [0.25, 0.32, 0.20], y: 0.01, z: 0.01 },
        Little: { x: [0.28, 0.36, 0.22], y: 0.02, z: 0.02 },
      };

  const segments = ['Proximal', 'Intermediate', 'Distal'];

  Object.entries(fingerCurvature).forEach(([finger, config]) => {
    segments.forEach((segment, i) => {
      const boneName = `${side}${finger}${segment}` as any;
      const bone = h.getNormalizedBoneNode(boneName);
      if (bone) {
        const curlX = config.x[i];
        if (i === 0) {
          bone.rotation.set(curlX, config.y, config.z);
        } else {
          bone.rotation.set(curlX, 0, 0);
        }
      }
    });
  });

  // 3. Thumb resting naturally alongside index finger
  const thumbProximal = h.getNormalizedBoneNode(`${side}ThumbProximal` as any);
  const thumbIntermediate = h.getNormalizedBoneNode(`${side}ThumbIntermediate` as any);
  const thumbDistal = h.getNormalizedBoneNode(`${side}ThumbDistal` as any);

  if (thumbProximal) {
    thumbProximal.rotation.set(0.14, 0.12 * sign, -0.14 * sign);
  }
  if (thumbIntermediate) {
    thumbIntermediate.rotation.set(0.10, 0.04 * sign, -0.08 * sign);
  }
  if (thumbDistal) {
    thumbDistal.rotation.set(0.10, 0, -0.04 * sign);
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
  const leftHand = h.getNormalizedBoneNode('leftHand');
  const rightHand = h.getNormalizedBoneNode('rightHand');
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
  if (leftHand) leftHand.rotation.copy(HUMAN_REST_EULERS.leftHand);
  if (rightHand) rightHand.rotation.copy(HUMAN_REST_EULERS.rightHand);
  if (spine) spine.rotation.copy(HUMAN_REST_EULERS.spine);
  if (chest) chest.rotation.copy(HUMAN_REST_EULERS.chest);
  if (upperChest) upperChest.rotation.copy(HUMAN_REST_EULERS.upperChest);
  if (neck) neck.rotation.copy(HUMAN_REST_EULERS.neck);
  if (head) head.rotation.copy(HUMAN_REST_EULERS.head);

  applyRelaxedHandPose(vrm, 'left');
  applyRelaxedHandPose(vrm, 'right');

  resetToNeutralExpression(vrm);

  h.update();
}

/**
 * Resets all expression blendshapes to their natural resting baseline:
 * eyes open (blink: 0), mouth closed (aa/ih/ou/ee/oh: 0), subtle natural pleasant warmth (happy: 0.15)
 */
export function resetToNeutralExpression(vrm: VRM | null | undefined): void {
  if (!vrm || !vrm.expressionManager) return;
  try {
    vrm.expressionManager.setValue('blink', 0);
    vrm.expressionManager.setValue('blinkLeft', 0);
    vrm.expressionManager.setValue('blinkRight', 0);
    vrm.expressionManager.setValue('aa', 0);      // mouth-open viseme, must be 0 when not speaking
    vrm.expressionManager.setValue('ih', 0);
    vrm.expressionManager.setValue('ou', 0);
    vrm.expressionManager.setValue('ee', 0);
    vrm.expressionManager.setValue('oh', 0);
    vrm.expressionManager.setValue('happy', 0.15); // a small, natural pleasant resting expression, NOT a full smile
    vrm.expressionManager.setValue('angry', 0);
    vrm.expressionManager.setValue('sad', 0);
    vrm.expressionManager.setValue('relaxed', 0);
    vrm.expressionManager.setValue('surprised', 0);
    vrm.expressionManager.update();
  } catch (err) {
    console.warn('[resetToNeutralExpression] Handled expression reset exception:', err);
  }
}

/**
 * Pre-settles spring bone physics (skirts, dresses, hair, ribbons) to natural hanging rest.
 * Solves the issue where models initially appear with flared or airborne skirts in bind pose.
 */
export function settleVRMPhysics(vrm: VRM | null | undefined, steps: number = 100, delta: number = 0.016): void {
  if (!vrm || !vrm.scene) return;
  try {
    safeUpdateMatrixWorld(vrm.scene);

    for (let i = 0; i < steps; i++) {
      try {
        vrm.update(delta);
      } catch {
        break;
      }
    }

    // Zero out residual velocities so bones rest statically without initial bounce
    if (vrm.springBoneManager && (vrm.springBoneManager as any).joints) {
      for (const joint of (vrm.springBoneManager as any).joints) {
        if (joint._prevTail && joint._currentTail) {
          joint._prevTail.copy(joint._currentTail);
        }
      }
    }

    safeUpdateMatrixWorld(vrm.scene);
  } catch (err) {
    console.warn('[settleVRMPhysics] Handled exception:', err);
  }
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


