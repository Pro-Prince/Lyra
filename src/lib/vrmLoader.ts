import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';
import * as THREE from 'three';

function createProceduralVRM(outfitId: string = 'lyra'): VRM {
  const scene = new THREE.Group();
  scene.name = `ProceduralVRM_${outfitId}`;

  const bones: Record<string, THREE.Object3D> = {};
  const boneNames = [
    'hips', 'spine', 'chest', 'neck', 'head',
    'leftUpperArm', 'leftLowerArm', 'leftHand',
    'rightUpperArm', 'rightLowerArm', 'rightHand',
    'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToeBase',
    'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToeBase',
    'leftThumbProximal', 'leftThumbIntermediate', 'leftThumbDistal',
    'leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal',
    'leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal',
    'leftRingProximal', 'leftRingIntermediate', 'leftRingDistal',
    'leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal',
    'rightThumbProximal', 'rightThumbIntermediate', 'rightThumbDistal',
    'rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal',
    'rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal',
    'rightRingProximal', 'rightRingIntermediate', 'rightRingDistal',
    'rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal'
  ];

  boneNames.forEach(name => {
    const obj = new THREE.Object3D();
    obj.name = name;
    bones[name] = obj;
  });

  if (bones.hips && bones.spine) { bones.hips.add(bones.spine); bones.spine.position.set(0, 0.1, 0); }
  if (bones.spine && bones.chest) { bones.spine.add(bones.chest); bones.chest.position.set(0, 0.15, 0); }
  if (bones.chest && bones.neck) { bones.chest.add(bones.neck); bones.neck.position.set(0, 0.2, 0); }
  if (bones.neck && bones.head) { bones.neck.add(bones.head); bones.head.position.set(0, 0.1, 0); }

  if (bones.chest && bones.leftUpperArm) { bones.chest.add(bones.leftUpperArm); bones.leftUpperArm.position.set(0.15, 0.15, 0); }
  if (bones.leftUpperArm && bones.leftLowerArm) { bones.leftUpperArm.add(bones.leftLowerArm); bones.leftLowerArm.position.set(0.25, 0, 0); }
  if (bones.leftLowerArm && bones.leftHand) { bones.leftLowerArm.add(bones.leftHand); bones.leftHand.position.set(0.25, 0, 0); }

  if (bones.chest && bones.rightUpperArm) { bones.chest.add(bones.rightUpperArm); bones.rightUpperArm.position.set(-0.15, 0.15, 0); }
  if (bones.rightUpperArm && bones.rightLowerArm) { bones.rightUpperArm.add(bones.rightLowerArm); bones.rightLowerArm.position.set(-0.25, 0, 0); }
  if (bones.rightLowerArm && bones.rightHand) { bones.rightLowerArm.add(bones.rightHand); bones.rightHand.position.set(-0.25, 0, 0); }

  if (bones.hips && bones.leftUpperLeg) { bones.hips.add(bones.leftUpperLeg); bones.leftUpperLeg.position.set(0.1, -0.1, 0); }
  if (bones.leftUpperLeg && bones.leftLowerLeg) { bones.leftUpperLeg.add(bones.leftLowerLeg); bones.leftLowerLeg.position.set(0, -0.4, 0); }
  if (bones.leftLowerLeg && bones.leftFoot) { bones.leftLowerLeg.add(bones.leftFoot); bones.leftFoot.position.set(0, -0.4, 0); }

  if (bones.hips && bones.rightUpperLeg) { bones.hips.add(bones.rightUpperLeg); bones.rightUpperLeg.position.set(-0.1, -0.1, 0); }
  if (bones.rightUpperLeg && bones.rightLowerLeg) { bones.rightUpperLeg.add(bones.rightLowerLeg); bones.rightLowerLeg.position.set(0, -0.4, 0); }
  if (bones.rightLowerLeg && bones.rightFoot) { bones.rightLowerLeg.add(bones.rightFoot); bones.rightFoot.position.set(0, -0.4, 0); }

  scene.add(bones.hips);
  bones.hips.position.set(0, 0.9, 0);

  const primaryColor = outfitId.includes('casual') ? 0x6366f1 : outfitId.includes('dress') ? 0xec4899 : 0xffb6c1;
  const hairColor = 0x2d1b4e;

  const headGeo = new THREE.SphereGeometry(0.15, 32, 32);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.6 });
  const headMesh = new THREE.Mesh(headGeo, headMat);
  headMesh.position.set(0, 0.1, 0);
  if (bones.head) bones.head.add(headMesh);

  const hairGeo = new THREE.SphereGeometry(0.16, 32, 32);
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.4 });
  const hairMesh = new THREE.Mesh(hairGeo, hairMat);
  hairMesh.position.set(0, 0.02, -0.02);
  if (bones.head) bones.head.add(hairMesh);

  const bodyGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.5, 32);
  const bodyMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.5 });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.set(0, -0.15, 0);
  if (bones.spine) bones.spine.add(bodyMesh);

  const humanoid = {
    getNormalizedBoneNode: (name: string) => bones[name] || null,
    update: () => {},
  } as any;

  const expressionManager = {
    setValue: () => {},
    update: () => {},
  } as any;

  return {
    scene,
    humanoid,
    expressionManager,
    update: (_delta: number) => {},
    meta: { title: outfitId },
  } as unknown as VRM;
}

export async function loadVRM(url: string): Promise<VRM> {
  const outfitId = url.includes('casual') ? 'lyra_casual' : url.includes('dress') ? 'lyra_dress' : 'lyra';
  console.log('Requesting:', url);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[loadVRM] HTTP error ${res.status} for ${url}, falling back to procedural model`);
      return createProceduralVRM(outfitId);
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('text/html')) {
      console.warn(`[loadVRM] Received HTML for ${url}, falling back to procedural model`);
      return createProceduralVRM(outfitId);
    }

    const arrayBuffer = await res.arrayBuffer();
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    const resourcePath = url.includes('/') ? url.substring(0, url.lastIndexOf('/') + 1) : '/models/';

    return new Promise<VRM>((resolve) => {
      loader.parse(
        arrayBuffer,
        resourcePath,
        (gltf) => {
          const vrm = gltf.userData.vrm as VRM;
          if (!vrm || !vrm.humanoid) {
            console.warn(`[loadVRM] No VRM humanoid found in ${url}, falling back to procedural model`);
            resolve(createProceduralVRM(outfitId));
            return;
          }
          console.log(`${url} loaded successfully. Humanoid present: true`);
          resolve(vrm);
        },
        (err) => {
          console.warn(`${url} load failed (${err}), falling back to procedural model`);
          resolve(createProceduralVRM(outfitId));
        }
      );
    });
  } catch (err) {
    console.warn(`[loadVRM] Exception for ${url}, falling back to procedural model:`, err);
    return createProceduralVRM(outfitId);
  }
}





