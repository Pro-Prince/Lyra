import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';
import { applyRestPose, applyRelaxedHandPose } from './poseUtils';

const MODEL_FILES: Record<string, string> = {
  lyra: '/models/lyra.vrm',
  lyra_casual: '/models/lyra_casual.vrm',
  lyra_dress: '/models/lyra_dress.vrm',
  '/models/lyra.vrm': '/models/lyra.vrm',
  '/models/lyra_casual.vrm': '/models/lyra_casual.vrm',
  '/models/lyra_dress.vrm': '/models/lyra_dress.vrm'
};

const LOAD_TIMEOUT_MS = 10000; // hard ceiling, this is what prevents "loading forever"
const modelCache: Record<string, VRM> = {}; // in-memory only, per session, no persistence layer

function createLoader() {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  return loader;
}

export async function loadCompanionModel(modelId: string): Promise<VRM> {
  if (modelCache[modelId]) return modelCache[modelId]; // already loaded this session

  const url = MODEL_FILES[modelId] || modelId; // fallback to treating modelId as url

  const loadPromise = (async () => {
    const loader = createLoader();
    const gltf = await loader.loadAsync(url); // fully independent, no shared rig, no shared state
    const vrm = gltf.userData.vrm as VRM;
    if (applyRestPose) applyRestPose(vrm);
    if (applyRelaxedHandPose) {
      applyRelaxedHandPose(vrm, 'left');
      applyRelaxedHandPose(vrm, 'right');
    }
    return vrm;
  })();

  const timeoutPromise = new Promise<VRM>((_, reject) =>
    setTimeout(() => reject(new Error(`Timed out loading ${modelId} after ${LOAD_TIMEOUT_MS}ms`)), LOAD_TIMEOUT_MS)
  );

  const vrm = await Promise.race([loadPromise, timeoutPromise]);
  modelCache[modelId] = vrm;
  return vrm;
}

export function isModelCached(modelId: string) {
  return !!modelCache[modelId];
}

export async function renderStaticPortrait(modelId: string, renderer: THREE.WebGLRenderer, { frame = 'full-body', size = 256 } = {}) {
  const vrm = await loadCompanionModel(modelId); // same cached loader, same pose guarantees
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(1, 2, 2);
  scene.add(key, vrm.scene);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 10);
  
  if (frame === 'full-body') {
    // Frame full body
    const boundingBox = new THREE.Box3().setFromObject(vrm.scene);
    const height = boundingBox.max.y - boundingBox.min.y;
    camera.position.set(0, height / 2, Math.max(2.5, height * 1.5));
    camera.lookAt(0, height / 2, 0);
  } else {
    // Frame portrait
    const head = vrm.humanoid?.getNormalizedBoneNode('head');
    const headY = head ? head.getWorldPosition(new THREE.Vector3()).y : 1.4;
    camera.position.set(0, headY, 0.8);
    camera.lookAt(0, headY, 0);
  }

  renderer.setSize(size, size);
  vrm.update(0); // Ensure VRM is updated before render
  renderer.render(scene, camera);
  
  return renderer.domElement.toDataURL('image/png');
}
