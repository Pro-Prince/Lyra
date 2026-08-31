import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { VRM } from '@pixiv/three-vrm';
import { safeUpdateMatrixWorld } from './companionRenderer';

const mixamoVRMRigMap: Record<string, string> = {
  mixamorigHips: 'hips',
  mixamorigSpine: 'spine',
  mixamorigSpine1: 'chest',
  mixamorigSpine2: 'upperChest',
  mixamorigNeck: 'neck',
  mixamorigHead: 'head',
  mixamorigLeftShoulder: 'leftShoulder',
  mixamorigLeftArm: 'leftUpperArm',
  mixamorigLeftForeArm: 'leftLowerArm',
  mixamorigLeftHand: 'leftHand',
  mixamorigRightShoulder: 'rightShoulder',
  mixamorigRightArm: 'rightUpperArm',
  mixamorigRightForeArm: 'rightLowerArm',
  mixamorigRightHand: 'rightHand',
  mixamorigLeftUpLeg: 'leftUpperLeg',
  mixamorigLeftLeg: 'leftLowerLeg',
  mixamorigLeftFoot: 'leftFoot',
  mixamorigLeftToeBase: 'leftToes',
  mixamorigRightUpLeg: 'rightUpperLeg',
  mixamorigRightLeg: 'rightLowerLeg',
  mixamorigRightFoot: 'rightFoot',
  mixamorigRightToeBase: 'rightToes',
};

const fingerMap: Record<string, string> = {};
['Left', 'Right'].forEach((side) => {
  const vrmSide = side.toLowerCase();
  const fingers = [
    ['Thumb', 'Thumb'],
    ['Index', 'Index'],
    ['Middle', 'Middle'],
    ['Ring', 'Ring'],
    ['Pinky', 'Little'],
  ];
  fingers.forEach(([mixamoName, vrmName]) => {
    [1, 2, 3].forEach((n, i) => {
      const segment = ['Proximal', 'Intermediate', 'Distal'][i];
      fingerMap[`mixamorig${side}Hand${mixamoName}${n}`] = `${vrmSide}${vrmName}${segment}`;
    });
  });
});

Object.assign(mixamoVRMRigMap, fingerMap);

export async function loadMixamoAnimation(url: string, vrm: VRM): Promise<THREE.AnimationClip | null> {
  const loader = new FBXLoader();
  const asset = await loader.loadAsync(url);
  
  const clip = THREE.AnimationClip.findByName(asset.animations, 'mixamo.com') || asset.animations[0];
  if (!clip) return null;

  const tracks: THREE.KeyframeTrack[] = [];

  const restRotationInverse = new THREE.Quaternion();
  const parentRestWorldRotation = new THREE.Quaternion();
  const _quatA = new THREE.Quaternion();

  const mixamoHips = asset.getObjectByName('mixamorigHips');
  let hipsPositionScale = 1;
  const vrmHips = vrm.humanoid.getNormalizedBoneNode('hips' as any);
  
  if (mixamoHips && vrmHips) {
    safeUpdateMatrixWorld(vrm.scene);
    safeUpdateMatrixWorld(asset);
    const motionHipsHeight = mixamoHips.getWorldPosition(new THREE.Vector3()).y;
    const vrmHipsHeight = vrmHips.getWorldPosition(new THREE.Vector3()).y;
    if (motionHipsHeight > 0) {
      hipsPositionScale = vrmHipsHeight / motionHipsHeight;
    }
  }

  clip.tracks.forEach((track) => {
    const trackSplitted = track.name.split('.');
    const mixamoRigName = trackSplitted[0];
    const vrmBoneName = mixamoVRMRigMap[mixamoRigName];
    const vrmNodeName = vrm.humanoid?.getNormalizedBoneNode(vrmBoneName as any)?.name;
    const mixamoRigNode = asset.getObjectByName(mixamoRigName);

    if (vrmNodeName != null && mixamoRigNode) {
      const propertyName = trackSplitted[1];

      mixamoRigNode.getWorldQuaternion(restRotationInverse).invert();
      if (mixamoRigNode.parent) {
        mixamoRigNode.parent.getWorldQuaternion(parentRestWorldRotation);
      } else {
        parentRestWorldRotation.identity();
      }

      if (track instanceof THREE.QuaternionKeyframeTrack) {
        for (let i = 0; i < track.values.length; i += 4) {
          const flatQuaternion = Array.from(track.values.slice(i, i + 4));
          _quatA.fromArray(flatQuaternion);
          _quatA
            .premultiply(parentRestWorldRotation)
            .multiply(restRotationInverse);
          _quatA.toArray(flatQuaternion);
          flatQuaternion.forEach((v, index) => {
            track.values[index + i] = v;
          });
        }

        const mappedValues = track.values.map((v, i) => (vrm.meta?.metaVersion === '0' && i % 2 === 0 ? -v : v));
        tracks.push(
          new THREE.QuaternionKeyframeTrack(
            `${vrmNodeName}.${propertyName}`,
            track.times,
            mappedValues
          )
        );
      } else if (track instanceof THREE.VectorKeyframeTrack) {
        const value = track.values.map((v, i) => (vrm.meta?.metaVersion === '0' && i % 3 !== 1 ? -v : v) * hipsPositionScale);
        tracks.push(new THREE.VectorKeyframeTrack(`${vrmNodeName}.${propertyName}`, track.times, value));
      }
    }
  });

  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}
