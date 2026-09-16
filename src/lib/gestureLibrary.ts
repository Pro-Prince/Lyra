import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { HUMAN_REST_EULERS } from './poseUtils';

export interface Waypoint {
  time: number;
  euler: THREE.Euler;
}

/**
 * Creates an organic C^2 continuous quaternion track using quintic SmootherStep interpolation.
 * S(u) = u^3 * (u * (u * 6 - 15) + 10) ensures velocity (1st derivative) and acceleration (2nd derivative)
 * are mathematically zero at boundaries, eliminating all robotic snapping and jerky transitions.
 */
export function slerpTrack(
  node: THREE.Object3D | null,
  waypoints: Waypoint[],
  totalDuration: number,
  samplesPerSecond = 30
): THREE.QuaternionKeyframeTrack | null {
  if (!node || waypoints.length === 0) return null;

  const times: number[] = [];
  const values: number[] = [];
  const totalSamples = Math.max(2, Math.round(totalDuration * samplesPerSecond));

  const quatWaypoints = waypoints.map(w => ({
    time: w.time,
    quat: new THREE.Quaternion().setFromEuler(w.euler)
  }));

  const tempQuat = new THREE.Quaternion();

  for (let i = 0; i <= totalSamples; i++) {
    const t = (i / totalSamples) * totalDuration;
    times.push(parseFloat(t.toFixed(4)));

    if (t <= quatWaypoints[0].time) {
      const q = quatWaypoints[0].quat;
      values.push(q.x, q.y, q.z, q.w);
      continue;
    }

    if (t >= quatWaypoints[quatWaypoints.length - 1].time) {
      const q = quatWaypoints[quatWaypoints.length - 1].quat;
      values.push(q.x, q.y, q.z, q.w);
      continue;
    }

    let idx = 0;
    while (idx < quatWaypoints.length - 1 && quatWaypoints[idx + 1].time < t) {
      idx++;
    }

    const w0 = quatWaypoints[idx];
    const w1 = quatWaypoints[idx + 1];
    const segDuration = w1.time - w0.time;
    const linearProgress = segDuration > 0 ? (t - w0.time) / segDuration : 0;

    // Quintic SmootherStep: 6u^5 - 15u^4 + 10u^3
    const u = Math.max(0, Math.min(1, linearProgress));
    const easedProgress = u * u * u * (u * (u * 6 - 15) + 10);

    tempQuat.copy(w0.quat).slerp(w1.quat, easedProgress);
    values.push(tempQuat.x, tempQuat.y, tempQuat.z, tempQuat.w);
  }

  return new THREE.QuaternionKeyframeTrack(`${node.name}.quaternion`, times, values);
}

/**
 * Builds a comprehensive, biomechanically accurate library of procedural human gestures and idles.
 * All motions originate and gracefully resolve back to the default resting pose (HUMAN_REST_EULERS)
 * with hands naturally resting together below the waistline.
 */
export function buildGestureLibrary(vrm: VRM): Record<string, THREE.AnimationClip> {
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

  const R = HUMAN_REST_EULERS;
  const clips: Record<string, THREE.AnimationClip> = {};

  // Names of all arm, shoulder, hand, and finger bones to exclude from gestures
  const armHandBoneNames = new Set([
    leftShoulder?.name, rightShoulder?.name,
    upperArmL?.name, upperArmR?.name,
    lowerArmL?.name, lowerArmR?.name,
    handL?.name, handR?.name,
  ].filter((n): n is string => Boolean(n)));

  const createClip = (name: string, duration: number, tracks: (THREE.QuaternionKeyframeTrack | null)[]) => {
    const valid = tracks.filter((t): t is THREE.QuaternionKeyframeTrack => {
      if (!t) return false;
      const nodeName = t.name.split('.')[0];
      if (armHandBoneNames.has(nodeName) || /hand|arm|shoulder|finger|thumb|index|middle|ring|little/i.test(nodeName)) {
        return false;
      }
      return true;
    });
    if (valid.length > 0) {
      clips[name] = new THREE.AnimationClip(name, duration, valid);
    }
  };

  // ==========================================
  // 1. GREETING & WELCOMING GESTURES
  // ==========================================

  // 1A. WAVE WARM (2.4s) - Classic cheerful single-hand greeting with wrist flutter & warm head tilt
  createClip('wave_warm', 2.4, [
    slerpTrack(rightShoulder, [
      { time: 0.0, euler: R.rightShoulder },
      { time: 0.45, euler: new THREE.Euler(0.04, -0.02, 0.06) },
      { time: 1.85, euler: new THREE.Euler(0.04, -0.02, 0.06) },
      { time: 2.4, euler: R.rightShoulder }
    ], 2.4),
    slerpTrack(upperArmR, [
      { time: 0.0, euler: R.rightUpperArm },
      { time: 0.50, euler: new THREE.Euler(0.42, -0.12, 0.52) },
      { time: 1.85, euler: new THREE.Euler(0.40, -0.12, 0.54) },
      { time: 2.4, euler: R.rightUpperArm }
    ], 2.4),
    slerpTrack(lowerArmR, [
      { time: 0.0, euler: R.rightLowerArm },
      { time: 0.50, euler: new THREE.Euler(1.28, 0.16, -0.12) },
      { time: 0.80, euler: new THREE.Euler(1.25, 0.26, -0.18) },
      { time: 1.10, euler: new THREE.Euler(1.30, 0.06, -0.06) },
      { time: 1.40, euler: new THREE.Euler(1.25, 0.26, -0.18) },
      { time: 1.70, euler: new THREE.Euler(1.28, 0.16, -0.12) },
      { time: 2.4, euler: R.rightLowerArm }
    ], 2.4),
    slerpTrack(handR, [
      { time: 0.0, euler: R.rightHand },
      { time: 0.50, euler: new THREE.Euler(0.10, 0.0, 0.0) },
      { time: 0.80, euler: new THREE.Euler(0.12, 0.22, 0.18) },
      { time: 1.10, euler: new THREE.Euler(0.08, -0.22, -0.18) },
      { time: 1.40, euler: new THREE.Euler(0.12, 0.22, 0.18) },
      { time: 1.70, euler: new THREE.Euler(0.10, 0.0, 0.0) },
      { time: 2.4, euler: R.rightHand }
    ], 2.4),
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.50, euler: new THREE.Euler(0.04, -0.06, -0.06) },
      { time: 1.85, euler: new THREE.Euler(0.04, -0.06, -0.06) },
      { time: 2.4, euler: R.head }
    ], 2.4),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 0.50, euler: new THREE.Euler(-0.035, -0.015, -0.01) },
      { time: 1.85, euler: new THREE.Euler(-0.035, -0.015, -0.01) },
      { time: 2.4, euler: R.chest }
    ], 2.4)
  ]);

  // 1B. WAVE SUBTLE (1.9s) - Gentle, intimate palm wave lifted mid-height
  createClip('wave_subtle', 1.9, [
    slerpTrack(upperArmR, [
      { time: 0.0, euler: R.rightUpperArm },
      { time: 0.45, euler: new THREE.Euler(0.15, -0.10, 0.85) },
      { time: 1.45, euler: new THREE.Euler(0.15, -0.10, 0.85) },
      { time: 1.9, euler: R.rightUpperArm }
    ], 1.9),
    slerpTrack(lowerArmR, [
      { time: 0.0, euler: R.rightLowerArm },
      { time: 0.45, euler: new THREE.Euler(1.10, 0.18, 0.05) },
      { time: 0.75, euler: new THREE.Euler(1.08, 0.28, -0.02) },
      { time: 1.10, euler: new THREE.Euler(1.12, 0.10, 0.10) },
      { time: 1.45, euler: new THREE.Euler(1.10, 0.18, 0.05) },
      { time: 1.9, euler: R.rightLowerArm }
    ], 1.9),
    slerpTrack(handR, [
      { time: 0.0, euler: R.rightHand },
      { time: 0.45, euler: new THREE.Euler(0.12, 0.10, 0.05) },
      { time: 0.75, euler: new THREE.Euler(0.15, 0.20, 0.10) },
      { time: 1.10, euler: new THREE.Euler(0.08, 0.02, 0.0) },
      { time: 1.45, euler: new THREE.Euler(0.12, 0.10, 0.05) },
      { time: 1.9, euler: R.rightHand }
    ], 1.9),
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.45, euler: new THREE.Euler(0.02, -0.04, -0.03) },
      { time: 1.45, euler: new THREE.Euler(0.02, -0.04, -0.03) },
      { time: 1.9, euler: R.head }
    ], 1.9)
  ]);

  // ==========================================
  // 2. NOD & AGREEMENT GESTURES
  // ==========================================

  // 2A. NOD GENTLE (1.4s) - Polite single assent nod with rebound
  createClip('nod_gentle', 1.4, [
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.42, euler: new THREE.Euler(0.15, 0.005, -0.005) },
      { time: 0.72, euler: new THREE.Euler(-0.01, 0, 0) },
      { time: 1.00, euler: new THREE.Euler(0.04, 0, 0) },
      { time: 1.4, euler: R.head }
    ], 1.4),
    slerpTrack(neck, [
      { time: 0.0, euler: R.neck },
      { time: 0.42, euler: new THREE.Euler(0.05, 0, 0) },
      { time: 0.72, euler: new THREE.Euler(-0.005, 0, 0) },
      { time: 1.00, euler: new THREE.Euler(0.02, 0, 0) },
      { time: 1.4, euler: R.neck }
    ], 1.4),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 0.42, euler: new THREE.Euler(-0.035, 0, 0) },
      { time: 1.4, euler: R.chest }
    ], 1.4)
  ]);

  // 2B. NOD EMPHATIC (1.8s) - Rhythmic double affirmative nod ("Yes, exactly!")
  createClip('nod_emphatic', 1.8, [
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.35, euler: new THREE.Euler(0.18, 0.01, 0) },
      { time: 0.65, euler: new THREE.Euler(0.01, 0, 0) },
      { time: 0.95, euler: new THREE.Euler(0.15, 0.01, 0) },
      { time: 1.30, euler: new THREE.Euler(0.01, 0, 0) },
      { time: 1.8, euler: R.head }
    ], 1.8),
    slerpTrack(neck, [
      { time: 0.0, euler: R.neck },
      { time: 0.35, euler: new THREE.Euler(0.06, 0, 0) },
      { time: 0.65, euler: new THREE.Euler(0.005, 0, 0) },
      { time: 0.95, euler: new THREE.Euler(0.05, 0, 0) },
      { time: 1.8, euler: R.neck }
    ], 1.8),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 0.35, euler: new THREE.Euler(-0.04, 0, 0) },
      { time: 0.95, euler: new THREE.Euler(-0.035, 0, 0) },
      { time: 1.8, euler: R.chest }
    ], 1.8)
  ]);

  // 2C. NOD THOUGHTFUL (2.0s) - Slow, deep understanding nod with slight side tilt
  createClip('nod_thoughtful', 2.0, [
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.65, euler: new THREE.Euler(0.14, -0.04, 0.06) },
      { time: 1.25, euler: new THREE.Euler(0.03, -0.02, 0.03) },
      { time: 2.0, euler: R.head }
    ], 2.0),
    slerpTrack(neck, [
      { time: 0.0, euler: R.neck },
      { time: 0.65, euler: new THREE.Euler(0.04, -0.02, 0.03) },
      { time: 2.0, euler: R.neck }
    ], 2.0),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 0.65, euler: new THREE.Euler(-0.03, 0.01, -0.01) },
      { time: 2.0, euler: R.chest }
    ], 2.0)
  ]);

  // ==========================================
  // 3. HEAD TILT & ATTENTIVE GESTURES
  // ==========================================

  // 3A. HEAD TILT INQUISITIVE (1.8s) - Curious tilt to the side with chin slightly raised
  createClip('head_tilt_inquisitive', 1.8, [
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.55, euler: new THREE.Euler(0.04, 0.04, -0.14) },
      { time: 1.35, euler: new THREE.Euler(0.04, 0.04, -0.13) },
      { time: 1.8, euler: R.head }
    ], 1.8),
    slerpTrack(neck, [
      { time: 0.0, euler: R.neck },
      { time: 0.55, euler: new THREE.Euler(0.02, 0.02, -0.06) },
      { time: 1.35, euler: new THREE.Euler(0.02, 0.02, -0.06) },
      { time: 1.8, euler: R.neck }
    ], 1.8),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 0.55, euler: new THREE.Euler(-0.02, -0.01, 0.015) },
      { time: 1.8, euler: R.chest }
    ], 1.8)
  ]);

  // 3B. HEAD TILT AFFECTION (2.2s) - Soft affectionate head tilt to the opposite side
  createClip('head_tilt_affection', 2.2, [
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.65, euler: new THREE.Euler(0.03, -0.05, 0.15) },
      { time: 1.60, euler: new THREE.Euler(0.03, -0.05, 0.14) },
      { time: 2.2, euler: R.head }
    ], 2.2),
    slerpTrack(neck, [
      { time: 0.0, euler: R.neck },
      { time: 0.65, euler: new THREE.Euler(0.02, -0.02, 0.06) },
      { time: 1.60, euler: new THREE.Euler(0.02, -0.02, 0.06) },
      { time: 2.2, euler: R.neck }
    ], 2.2),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 0.65, euler: new THREE.Euler(-0.03, 0.01, -0.015) },
      { time: 2.2, euler: R.chest }
    ], 2.2)
  ]);

  // ==========================================
  // 4. CONVERSATIONAL EXPLANATION GESTURES
  // ==========================================

  // 4A. EXPLAIN BOTH HANDS (2.6s) - Both hands open gently outwards from waist, palms up
  createClip('explain_both_hands', 2.6, [
    slerpTrack(upperArmL, [
      { time: 0.0, euler: R.leftUpperArm },
      { time: 0.65, euler: new THREE.Euler(0.12, 0.20, -0.92) },
      { time: 1.85, euler: new THREE.Euler(0.10, 0.20, -0.94) },
      { time: 2.6, euler: R.leftUpperArm }
    ], 2.6),
    slerpTrack(upperArmR, [
      { time: 0.0, euler: R.rightUpperArm },
      { time: 0.65, euler: new THREE.Euler(0.12, -0.20, 0.92) },
      { time: 1.85, euler: new THREE.Euler(0.10, -0.20, 0.94) },
      { time: 2.6, euler: R.rightUpperArm }
    ], 2.6),
    slerpTrack(lowerArmL, [
      { time: 0.0, euler: R.leftLowerArm },
      { time: 0.65, euler: new THREE.Euler(0.68, -0.15, -0.32) },
      { time: 1.85, euler: new THREE.Euler(0.65, -0.15, -0.32) },
      { time: 2.6, euler: R.leftLowerArm }
    ], 2.6),
    slerpTrack(lowerArmR, [
      { time: 0.0, euler: R.rightLowerArm },
      { time: 0.65, euler: new THREE.Euler(0.68, 0.15, 0.32) },
      { time: 1.85, euler: new THREE.Euler(0.65, 0.15, 0.32) },
      { time: 2.6, euler: R.rightLowerArm }
    ], 2.6),
    slerpTrack(handL, [
      { time: 0.0, euler: R.leftHand },
      { time: 0.65, euler: new THREE.Euler(0.22, -0.10, -0.15) },
      { time: 1.85, euler: new THREE.Euler(0.22, -0.10, -0.15) },
      { time: 2.6, euler: R.leftHand }
    ], 2.6),
    slerpTrack(handR, [
      { time: 0.0, euler: R.rightHand },
      { time: 0.65, euler: new THREE.Euler(0.22, 0.10, 0.15) },
      { time: 1.85, euler: new THREE.Euler(0.22, 0.10, 0.15) },
      { time: 2.6, euler: R.rightHand }
    ], 2.6),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 0.65, euler: new THREE.Euler(-0.04, 0, 0) },
      { time: 2.6, euler: R.chest }
    ], 2.6),
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.65, euler: new THREE.Euler(0.04, 0, 0) },
      { time: 2.6, euler: R.head }
    ], 2.6)
  ]);

  // 4B. EXPLAIN ONE HAND (2.3s) - Right hand opens in communicative gesture ("you see")
  createClip('explain_one_hand', 2.3, [
    slerpTrack(upperArmR, [
      { time: 0.0, euler: R.rightUpperArm },
      { time: 0.60, euler: new THREE.Euler(0.18, -0.18, 0.88) },
      { time: 1.65, euler: new THREE.Euler(0.16, -0.18, 0.90) },
      { time: 2.3, euler: R.rightUpperArm }
    ], 2.3),
    slerpTrack(lowerArmR, [
      { time: 0.0, euler: R.rightLowerArm },
      { time: 0.60, euler: new THREE.Euler(0.85, 0.22, 0.20) },
      { time: 1.65, euler: new THREE.Euler(0.82, 0.22, 0.20) },
      { time: 2.3, euler: R.rightLowerArm }
    ], 2.3),
    slerpTrack(handR, [
      { time: 0.0, euler: R.rightHand },
      { time: 0.60, euler: new THREE.Euler(0.18, 0.12, 0.12) },
      { time: 1.65, euler: new THREE.Euler(0.18, 0.12, 0.12) },
      { time: 2.3, euler: R.rightHand }
    ], 2.3),
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.60, euler: new THREE.Euler(0.03, -0.04, -0.02) },
      { time: 2.3, euler: R.head }
    ], 2.3),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 0.60, euler: new THREE.Euler(-0.03, -0.015, -0.01) },
      { time: 2.3, euler: R.chest }
    ], 2.3)
  ]);

  // 4C. HANDS CLASPED PULSE (1.8s) - Conversational emphasis with hands held, subtle chest lift
  createClip('hands_clasped_pulse', 1.8, [
    slerpTrack(lowerArmL, [
      { time: 0.0, euler: R.leftLowerArm },
      { time: 0.45, euler: new THREE.Euler(R.leftLowerArm.x + 0.06, R.leftLowerArm.y, R.leftLowerArm.z) },
      { time: 1.8, euler: R.leftLowerArm }
    ], 1.8),
    slerpTrack(lowerArmR, [
      { time: 0.0, euler: R.rightLowerArm },
      { time: 0.45, euler: new THREE.Euler(R.rightLowerArm.x + 0.06, R.rightLowerArm.y, R.rightLowerArm.z) },
      { time: 1.8, euler: R.rightLowerArm }
    ], 1.8),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 0.45, euler: new THREE.Euler(-0.045, 0, 0) },
      { time: 1.8, euler: R.chest }
    ], 1.8),
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.45, euler: new THREE.Euler(0.06, 0, 0) },
      { time: 1.8, euler: R.head }
    ], 1.8)
  ]);

  // ==========================================
  // 5. EMOTIONAL & AFFECTIONATE GESTURES
  // ==========================================

  // 5A. HAND TO HEART (2.5s) - Deep warmth, sincere appreciation, right hand at heart
  createClip('hand_to_heart', 2.5, [
    slerpTrack(upperArmR, [
      { time: 0.0, euler: R.rightUpperArm },
      { time: 0.65, euler: new THREE.Euler(0.32, -0.15, 0.72) },
      { time: 1.85, euler: new THREE.Euler(0.30, -0.15, 0.74) },
      { time: 2.5, euler: R.rightUpperArm }
    ], 2.5),
    slerpTrack(lowerArmR, [
      { time: 0.0, euler: R.rightLowerArm },
      { time: 0.65, euler: new THREE.Euler(1.35, 0.35, -0.18) },
      { time: 1.85, euler: new THREE.Euler(1.32, 0.35, -0.18) },
      { time: 2.5, euler: R.rightLowerArm }
    ], 2.5),
    slerpTrack(handR, [
      { time: 0.0, euler: R.rightHand },
      { time: 0.65, euler: new THREE.Euler(0.20, 0.15, 0.08) },
      { time: 1.85, euler: new THREE.Euler(0.20, 0.15, 0.08) },
      { time: 2.5, euler: R.rightHand }
    ], 2.5),
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.65, euler: new THREE.Euler(0.06, -0.04, 0.05) },
      { time: 1.85, euler: new THREE.Euler(0.06, -0.04, 0.05) },
      { time: 2.5, euler: R.head }
    ], 2.5),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 0.65, euler: new THREE.Euler(-0.045, -0.015, -0.01) },
      { time: 1.85, euler: new THREE.Euler(-0.045, -0.015, -0.01) },
      { time: 2.5, euler: R.chest }
    ], 2.5)
  ]);

  // 5B. LEAN IN LISTEN (2.3s) - Torso leans gently toward user with attentive tilt
  createClip('lean_in_listen', 2.3, [
    slerpTrack(spine, [
      { time: 0.0, euler: R.spine },
      { time: 0.60, euler: new THREE.Euler(0.065, 0, 0) },
      { time: 1.70, euler: new THREE.Euler(0.065, 0, 0) },
      { time: 2.3, euler: R.spine }
    ], 2.3),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 0.60, euler: new THREE.Euler(-0.01, 0, 0) },
      { time: 2.3, euler: R.chest }
    ], 2.3),
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.60, euler: new THREE.Euler(0.02, 0.04, -0.08) },
      { time: 1.70, euler: new THREE.Euler(0.02, 0.04, -0.08) },
      { time: 2.3, euler: R.head }
    ], 2.3)
  ]);

  // 5C. REASSURE CALM (2.4s) - Right hand softly extends forward, comforting gesture
  createClip('reassure_calm', 2.4, [
    slerpTrack(upperArmR, [
      { time: 0.0, euler: R.rightUpperArm },
      { time: 0.65, euler: new THREE.Euler(0.24, -0.12, 0.95) },
      { time: 1.75, euler: new THREE.Euler(0.22, -0.12, 0.97) },
      { time: 2.4, euler: R.rightUpperArm }
    ], 2.4),
    slerpTrack(lowerArmR, [
      { time: 0.0, euler: R.rightLowerArm },
      { time: 0.65, euler: new THREE.Euler(0.72, 0.10, 0.05) },
      { time: 1.75, euler: new THREE.Euler(0.70, 0.10, 0.05) },
      { time: 2.4, euler: R.rightLowerArm }
    ], 2.4),
    slerpTrack(handR, [
      { time: 0.0, euler: R.rightHand },
      { time: 0.65, euler: new THREE.Euler(0.12, 0.05, -0.08) }, // Palm soothingly downward
      { time: 1.75, euler: new THREE.Euler(0.12, 0.05, -0.08) },
      { time: 2.4, euler: R.rightHand }
    ], 2.4),
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.65, euler: new THREE.Euler(0.04, -0.03, 0.04) },
      { time: 2.4, euler: R.head }
    ], 2.4)
  ]);

  // ==========================================
  // 6. THINKING & REFLECTION GESTURES
  // ==========================================

  // 6A. THINK CHIN REST (2.4s) - Classic thoughtful pose, hand near chin, upward side gaze
  createClip('think_chin_rest', 2.4, [
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.55, euler: new THREE.Euler(0.06, -0.13, 0.09) },
      { time: 1.85, euler: new THREE.Euler(0.05, -0.12, 0.08) },
      { time: 2.4, euler: R.head }
    ], 2.4),
    slerpTrack(neck, [
      { time: 0.0, euler: R.neck },
      { time: 0.55, euler: new THREE.Euler(0.03, -0.06, 0.04) },
      { time: 1.85, euler: new THREE.Euler(0.03, -0.06, 0.04) },
      { time: 2.4, euler: R.neck }
    ], 2.4),
    slerpTrack(upperArmR, [
      { time: 0.0, euler: R.rightUpperArm },
      { time: 0.55, euler: new THREE.Euler(0.42, -0.12, 0.78) },
      { time: 1.85, euler: new THREE.Euler(0.40, -0.12, 0.80) },
      { time: 2.4, euler: R.rightUpperArm }
    ], 2.4),
    slerpTrack(lowerArmR, [
      { time: 0.0, euler: R.rightLowerArm },
      { time: 0.55, euler: new THREE.Euler(1.42, 0.35, -0.22) },
      { time: 1.85, euler: new THREE.Euler(1.40, 0.35, -0.22) },
      { time: 2.4, euler: R.rightLowerArm }
    ], 2.4),
    slerpTrack(handR, [
      { time: 0.0, euler: R.rightHand },
      { time: 0.55, euler: new THREE.Euler(0.16, 0.10, 0.06) },
      { time: 1.85, euler: new THREE.Euler(0.16, 0.10, 0.06) },
      { time: 2.4, euler: R.rightHand }
    ], 2.4),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 0.55, euler: new THREE.Euler(-0.03, -0.03, 0.015) },
      { time: 2.4, euler: R.chest }
    ], 2.4)
  ]);

  // 6B. THINK PONDER (2.2s) - Hands stay comfortably clasped, head lifts slightly in thought
  createClip('think_ponder', 2.2, [
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.55, euler: new THREE.Euler(-0.08, 0.08, -0.06) },
      { time: 1.65, euler: new THREE.Euler(-0.07, 0.08, -0.06) },
      { time: 2.2, euler: R.head }
    ], 2.2),
    slerpTrack(neck, [
      { time: 0.0, euler: R.neck },
      { time: 0.55, euler: new THREE.Euler(-0.03, 0.04, -0.02) },
      { time: 2.2, euler: R.neck }
    ], 2.2),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 0.55, euler: new THREE.Euler(-0.04, 0.015, -0.01) },
      { time: 2.2, euler: R.chest }
    ], 2.2)
  ]);

  // ==========================================
  // 7. HUMOR, LAUGHTER & PLAYFUL GESTURES
  // ==========================================

  // 7A. LAUGH BASHFUL (2.0s) - Hand softly near mouth, joyful double chuckle
  createClip('laugh_bashful', 2.0, [
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.40, euler: new THREE.Euler(-0.09, 0.03, 0.04) },
      { time: 0.75, euler: new THREE.Euler(-0.03, 0.01, 0.02) },
      { time: 1.10, euler: new THREE.Euler(-0.08, 0.03, 0.03) },
      { time: 1.50, euler: new THREE.Euler(0.01, 0.01, 0.01) },
      { time: 2.0, euler: R.head }
    ], 2.0),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 0.40, euler: new THREE.Euler(-0.06, 0, 0) },
      { time: 0.75, euler: new THREE.Euler(-0.02, 0, 0) },
      { time: 1.10, euler: new THREE.Euler(-0.05, 0, 0) },
      { time: 1.50, euler: new THREE.Euler(-0.02, 0, 0) },
      { time: 2.0, euler: R.chest }
    ], 2.0),
    slerpTrack(upperArmR, [
      { time: 0.0, euler: R.rightUpperArm },
      { time: 0.45, euler: new THREE.Euler(0.34, -0.06, 0.92) },
      { time: 1.50, euler: new THREE.Euler(0.32, -0.06, 0.94) },
      { time: 2.0, euler: R.rightUpperArm }
    ], 2.0),
    slerpTrack(lowerArmR, [
      { time: 0.0, euler: R.rightLowerArm },
      { time: 0.45, euler: new THREE.Euler(1.15, 0.24, -0.16) },
      { time: 1.50, euler: new THREE.Euler(1.12, 0.24, -0.16) },
      { time: 2.0, euler: R.rightLowerArm }
    ], 2.0),
    slerpTrack(handR, [
      { time: 0.0, euler: R.rightHand },
      { time: 0.45, euler: new THREE.Euler(0.14, 0.05, 0.04) },
      { time: 2.0, euler: R.rightHand }
    ], 2.0)
  ]);

  // 7B. LAUGH DELIGHT (2.2s) - Joyful open laugh, torso leans back slightly, buoyant
  createClip('laugh_delight', 2.2, [
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.45, euler: new THREE.Euler(-0.12, 0.05, -0.04) },
      { time: 0.85, euler: new THREE.Euler(-0.04, 0.02, -0.02) },
      { time: 1.25, euler: new THREE.Euler(-0.10, 0.04, -0.03) },
      { time: 2.2, euler: R.head }
    ], 2.2),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 0.45, euler: new THREE.Euler(-0.065, 0.01, 0) },
      { time: 0.85, euler: new THREE.Euler(-0.02, 0, 0) },
      { time: 1.25, euler: new THREE.Euler(-0.055, 0.01, 0) },
      { time: 2.2, euler: R.chest }
    ], 2.2)
  ]);

  // 7C. SHRUG PLAYFUL (1.9s) - Both shoulders lift, palms turn slightly out ("Who knows?")
  createClip('shrug_playful', 1.9, [
    slerpTrack(leftShoulder, [
      { time: 0.0, euler: R.leftShoulder },
      { time: 0.50, euler: new THREE.Euler(0.04, 0.02, -0.10) },
      { time: 1.35, euler: new THREE.Euler(0.04, 0.02, -0.10) },
      { time: 1.9, euler: R.leftShoulder }
    ], 1.9),
    slerpTrack(rightShoulder, [
      { time: 0.0, euler: R.rightShoulder },
      { time: 0.50, euler: new THREE.Euler(0.04, -0.02, 0.10) },
      { time: 1.35, euler: new THREE.Euler(0.04, -0.02, 0.10) },
      { time: 1.9, euler: R.rightShoulder }
    ], 1.9),
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.50, euler: new THREE.Euler(0.04, 0.04, -0.12) },
      { time: 1.35, euler: new THREE.Euler(0.04, 0.04, -0.12) },
      { time: 1.9, euler: R.head }
    ], 1.9),
    slerpTrack(upperArmL, [
      { time: 0.0, euler: R.leftUpperArm },
      { time: 0.50, euler: new THREE.Euler(R.leftUpperArm.x + 0.06, R.leftUpperArm.y + 0.08, R.leftUpperArm.z + 0.08) },
      { time: 1.9, euler: R.leftUpperArm }
    ], 1.9),
    slerpTrack(upperArmR, [
      { time: 0.0, euler: R.rightUpperArm },
      { time: 0.50, euler: new THREE.Euler(R.rightUpperArm.x + 0.06, R.rightUpperArm.y - 0.08, R.rightUpperArm.z - 0.08) },
      { time: 1.9, euler: R.rightUpperArm }
    ], 1.9)
  ]);

  // 7D. GIGGLE SHY (1.8s) - Cute downward gaze tilt with gentle shoulder shrug
  createClip('giggle_shy', 1.8, [
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.45, euler: new THREE.Euler(0.12, -0.08, 0.08) },
      { time: 1.25, euler: new THREE.Euler(0.10, -0.08, 0.08) },
      { time: 1.8, euler: R.head }
    ], 1.8),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 0.45, euler: new THREE.Euler(-0.04, 0.01, -0.01) },
      { time: 1.8, euler: R.chest }
    ], 1.8)
  ]);

  // ==========================================
  // 8. CELEBRATION & SURPRISE GESTURES
  // ==========================================

  // 8A. CHEER CELEBRATE (2.3s) - Joyous raised curved arms, lifted posture, bright head position
  createClip('cheer_celebrate', 2.3, [
    slerpTrack(upperArmL, [
      { time: 0.0, euler: R.leftUpperArm },
      { time: 0.55, euler: new THREE.Euler(0.36, 0.08, -0.48) },
      { time: 1.65, euler: new THREE.Euler(0.34, 0.08, -0.50) },
      { time: 2.3, euler: R.leftUpperArm }
    ], 2.3),
    slerpTrack(upperArmR, [
      { time: 0.0, euler: R.rightUpperArm },
      { time: 0.55, euler: new THREE.Euler(0.36, -0.08, 0.48) },
      { time: 1.65, euler: new THREE.Euler(0.34, -0.08, 0.50) },
      { time: 2.3, euler: R.rightUpperArm }
    ], 2.3),
    slerpTrack(lowerArmL, [
      { time: 0.0, euler: R.leftLowerArm },
      { time: 0.55, euler: new THREE.Euler(0.85, 0.12, 0.20) },
      { time: 1.65, euler: new THREE.Euler(0.82, 0.12, 0.20) },
      { time: 2.3, euler: R.leftLowerArm }
    ], 2.3),
    slerpTrack(lowerArmR, [
      { time: 0.0, euler: R.rightLowerArm },
      { time: 0.55, euler: new THREE.Euler(0.85, -0.12, -0.20) },
      { time: 1.65, euler: new THREE.Euler(0.82, -0.12, -0.20) },
      { time: 2.3, euler: R.rightLowerArm }
    ], 2.3),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 0.55, euler: new THREE.Euler(-0.06, 0, 0) },
      { time: 1.65, euler: new THREE.Euler(-0.05, 0, 0) },
      { time: 2.3, euler: R.chest }
    ], 2.3),
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.55, euler: new THREE.Euler(-0.08, 0, 0) },
      { time: 1.65, euler: new THREE.Euler(-0.07, 0, 0) },
      { time: 2.3, euler: R.head }
    ], 2.3)
  ]);

  // 8B. COURTEOUS BOW (2.0s) - Respectful, graceful upper body bow with hands neatly held
  createClip('courteous_bow', 2.0, [
    slerpTrack(spine, [
      { time: 0.0, euler: R.spine },
      { time: 0.65, euler: new THREE.Euler(0.18, 0, 0) },
      { time: 1.35, euler: new THREE.Euler(0.18, 0, 0) },
      { time: 2.0, euler: R.spine }
    ], 2.0),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 0.65, euler: new THREE.Euler(0.06, 0, 0) },
      { time: 1.35, euler: new THREE.Euler(0.06, 0, 0) },
      { time: 2.0, euler: R.chest }
    ], 2.0),
    slerpTrack(neck, [
      { time: 0.0, euler: R.neck },
      { time: 0.65, euler: new THREE.Euler(0.06, 0, 0) },
      { time: 2.0, euler: R.neck }
    ], 2.0),
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.65, euler: new THREE.Euler(0.08, 0, 0) },
      { time: 2.0, euler: R.head }
    ], 2.0)
  ]);

  // 8C. SURPRISED DELIGHT (1.8s) - Sudden pleasant surprise, subtle backward recoil & chest lift
  createClip('surprised_delight', 1.8, [
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 0.35, euler: new THREE.Euler(-0.06, 0.02, 0) },
      { time: 1.15, euler: new THREE.Euler(-0.05, 0.02, 0) },
      { time: 1.8, euler: R.head }
    ], 1.8),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 0.35, euler: new THREE.Euler(-0.065, 0, 0) },
      { time: 1.15, euler: new THREE.Euler(-0.055, 0, 0) },
      { time: 1.8, euler: R.chest }
    ], 1.8),
    slerpTrack(lowerArmL, [
      { time: 0.0, euler: R.leftLowerArm },
      { time: 0.35, euler: new THREE.Euler(R.leftLowerArm.x + 0.10, R.leftLowerArm.y, R.leftLowerArm.z) },
      { time: 1.8, euler: R.leftLowerArm }
    ], 1.8),
    slerpTrack(lowerArmR, [
      { time: 0.0, euler: R.rightLowerArm },
      { time: 0.35, euler: new THREE.Euler(R.rightLowerArm.x + 0.10, R.rightLowerArm.y, R.rightLowerArm.z) },
      { time: 1.8, euler: R.rightLowerArm }
    ], 1.8)
  ]);

  // ==========================================
  // 9. ORGANIC HUMAN IDLE LOOPS (Hands beside body)
  // ==========================================

  // 9A. IDLE DEFAULT (4.0s loop) - Subtle rhythmic breathing with micro-sways
  createClip('idle_default', 4.0, [
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 1.0, euler: new THREE.Euler(-0.042, 0.005, 0) },
      { time: 2.0, euler: R.chest },
      { time: 3.0, euler: new THREE.Euler(-0.018, -0.005, 0) },
      { time: 4.0, euler: R.chest }
    ], 4.0),
    slerpTrack(spine, [
      { time: 0.0, euler: R.spine },
      { time: 1.0, euler: new THREE.Euler(0.025, 0.008, 0.003) },
      { time: 2.0, euler: R.spine },
      { time: 3.0, euler: new THREE.Euler(0.015, -0.008, -0.003) },
      { time: 4.0, euler: R.spine }
    ], 4.0),
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 1.0, euler: new THREE.Euler(0.032, 0.010, 0.006) },
      { time: 2.0, euler: R.head },
      { time: 3.0, euler: new THREE.Euler(0.012, -0.010, -0.006) },
      { time: 4.0, euler: R.head }
    ], 4.0),
    slerpTrack(upperArmL, [
      { time: 0.0, euler: R.leftUpperArm },
      { time: 1.0, euler: new THREE.Euler(R.leftUpperArm.x - 0.010, R.leftUpperArm.y + 0.005, R.leftUpperArm.z) },
      { time: 2.0, euler: R.leftUpperArm },
      { time: 3.0, euler: new THREE.Euler(R.leftUpperArm.x + 0.008, R.leftUpperArm.y - 0.004, R.leftUpperArm.z) },
      { time: 4.0, euler: R.leftUpperArm }
    ], 4.0),
    slerpTrack(upperArmR, [
      { time: 0.0, euler: R.rightUpperArm },
      { time: 1.0, euler: new THREE.Euler(R.rightUpperArm.x - 0.010, R.rightUpperArm.y - 0.005, R.rightUpperArm.z) },
      { time: 2.0, euler: R.rightUpperArm },
      { time: 3.0, euler: new THREE.Euler(R.rightUpperArm.x + 0.008, R.rightUpperArm.y + 0.004, R.rightUpperArm.z) },
      { time: 4.0, euler: R.rightUpperArm }
    ], 4.0),
    slerpTrack(lowerArmL, [
      { time: 0.0, euler: R.leftLowerArm },
      { time: 1.0, euler: new THREE.Euler(R.leftLowerArm.x + 0.008, R.leftLowerArm.y, R.leftLowerArm.z) },
      { time: 2.0, euler: R.leftLowerArm },
      { time: 3.0, euler: new THREE.Euler(R.leftLowerArm.x - 0.006, R.leftLowerArm.y, R.leftLowerArm.z) },
      { time: 4.0, euler: R.leftLowerArm }
    ], 4.0),
    slerpTrack(lowerArmR, [
      { time: 0.0, euler: R.rightLowerArm },
      { time: 1.0, euler: new THREE.Euler(R.rightLowerArm.x + 0.008, R.rightLowerArm.y, R.rightLowerArm.z) },
      { time: 2.0, euler: R.rightLowerArm },
      { time: 3.0, euler: new THREE.Euler(R.rightLowerArm.x - 0.006, R.rightLowerArm.y, R.rightLowerArm.z) },
      { time: 4.0, euler: R.rightLowerArm }
    ], 4.0)
  ]);

  // 9B. IDLE WEIGHT SHIFT LEFT (5.0s loop) - Shifts weight onto left side, gentle pelvis/spine counter-curve
  createClip('idle_weight_shift_left', 5.0, [
    slerpTrack(spine, [
      { time: 0.0, euler: R.spine },
      { time: 1.6, euler: new THREE.Euler(0.015, -0.015, -0.02) },
      { time: 3.6, euler: new THREE.Euler(0.022, 0.010, 0.01) },
      { time: 5.0, euler: R.spine }
    ], 5.0),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 1.6, euler: new THREE.Euler(-0.025, 0.015, 0.015) },
      { time: 3.6, euler: new THREE.Euler(-0.020, -0.010, -0.01) },
      { time: 5.0, euler: R.chest }
    ], 5.0),
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 1.6, euler: new THREE.Euler(0.025, 0.02, 0.018) },
      { time: 3.6, euler: new THREE.Euler(0.015, -0.015, -0.012) },
      { time: 5.0, euler: R.head }
    ], 5.0),
    slerpTrack(upperArmL, [
      { time: 0.0, euler: R.leftUpperArm },
      { time: 2.5, euler: new THREE.Euler(R.leftUpperArm.x + 0.008, R.leftUpperArm.y, R.leftUpperArm.z) },
      { time: 5.0, euler: R.leftUpperArm }
    ], 5.0),
    slerpTrack(upperArmR, [
      { time: 0.0, euler: R.rightUpperArm },
      { time: 2.5, euler: new THREE.Euler(R.rightUpperArm.x - 0.008, R.rightUpperArm.y, R.rightUpperArm.z) },
      { time: 5.0, euler: R.rightUpperArm }
    ], 5.0)
  ]);

  // 9C. IDLE WEIGHT SHIFT RIGHT (5.2s loop) - Shifts weight onto right side
  createClip('idle_weight_shift_right', 5.2, [
    slerpTrack(spine, [
      { time: 0.0, euler: R.spine },
      { time: 1.8, euler: new THREE.Euler(0.018, 0.018, 0.022) },
      { time: 3.8, euler: new THREE.Euler(0.014, -0.012, -0.012) },
      { time: 5.2, euler: R.spine }
    ], 5.2),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 1.8, euler: new THREE.Euler(-0.028, -0.018, -0.018) },
      { time: 3.8, euler: new THREE.Euler(-0.018, 0.012, 0.012) },
      { time: 5.2, euler: R.chest }
    ], 5.2),
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 1.8, euler: new THREE.Euler(0.022, -0.022, -0.02) },
      { time: 3.8, euler: new THREE.Euler(0.016, 0.015, 0.015) },
      { time: 5.2, euler: R.head }
    ], 5.2)
  ]);

  // 9D. IDLE CONTEMPLATIVE (4.8s loop) - Relaxed standing posture with peaceful chest cadence
  createClip('idle_contemplative', 4.8, [
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 1.4, euler: new THREE.Euler(0.018, -0.025, 0.02) },
      { time: 3.4, euler: new THREE.Euler(0.025, 0.015, -0.015) },
      { time: 4.8, euler: R.head }
    ], 4.8),
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 1.4, euler: new THREE.Euler(-0.038, 0.01, -0.01) },
      { time: 3.4, euler: new THREE.Euler(-0.018, 0.01, -0.01) },
      { time: 4.8, euler: R.chest }
    ], 4.8),
    slerpTrack(spine, [
      { time: 0.0, euler: R.spine },
      { time: 1.4, euler: new THREE.Euler(0.018, -0.01, 0.01) },
      { time: 3.4, euler: new THREE.Euler(0.022, -0.01, 0.01) },
      { time: 4.8, euler: R.spine }
    ], 4.8)
  ]);

  // 9E. IDLE ATTENTIVE (4.4s loop) - Poised, listening stance with slight upward chest
  createClip('idle_attentive', 4.4, [
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 1.2, euler: new THREE.Euler(-0.045, 0, 0) },
      { time: 2.8, euler: new THREE.Euler(-0.025, 0, 0) },
      { time: 4.4, euler: R.chest }
    ], 4.4),
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 1.2, euler: new THREE.Euler(0.04, 0.01, 0) },
      { time: 2.8, euler: new THREE.Euler(0.02, -0.01, 0) },
      { time: 4.4, euler: R.head }
    ], 4.4)
  ]);

  // 9F. IDLE RELAXED SIGH (5.8s loop) - Slow deep relaxing breathing cycle
  createClip('idle_relaxed_sigh', 5.8, [
    slerpTrack(chest, [
      { time: 0.0, euler: R.chest },
      { time: 1.5, euler: new THREE.Euler(-0.055, 0, 0) },
      { time: 3.2, euler: new THREE.Euler(-0.010, 0, 0) },
      { time: 4.5, euler: new THREE.Euler(-0.030, 0, 0) },
      { time: 5.8, euler: R.chest }
    ], 5.8),
    slerpTrack(spine, [
      { time: 0.0, euler: R.spine },
      { time: 1.5, euler: new THREE.Euler(0.032, 0, 0) },
      { time: 3.2, euler: new THREE.Euler(0.010, 0, 0) },
      { time: 5.8, euler: R.spine }
    ], 5.8),
    slerpTrack(head, [
      { time: 0.0, euler: R.head },
      { time: 1.5, euler: new THREE.Euler(0.045, 0, 0) },
      { time: 3.2, euler: new THREE.Euler(0.005, 0, 0) },
      { time: 5.8, euler: R.head }
    ], 5.8)
  ]);

  // Canonical standard aliases
  clips['idle'] = clips['idle_default'];
  clips['procedural_idle'] = clips['idle_default'];
  clips['idle_weight_shift'] = clips['idle_weight_shift_left'];
  clips['idle_shift'] = clips['idle_weight_shift_left'];
  clips['hands_rest_pulse'] = clips['hands_clasped_pulse'];

  // Legacy mappings to preserve compatibility with any direct caller
  clips['wave'] = clips['wave_warm'];
  clips['nod'] = clips['nod_gentle'];
  clips['laugh'] = clips['laugh_bashful'];
  clips['think'] = clips['think_chin_rest'];
  clips['cheer'] = clips['cheer_celebrate'];
  clips['gesture_head_tilt'] = clips['head_tilt_inquisitive'];

  return clips;
}
