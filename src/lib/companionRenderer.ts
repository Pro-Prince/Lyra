import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';
import { applyRestPose, applyRelaxedHandPose, frameFullBody, framePortrait, frameOutfit } from './poseUtils';

export const MODEL_FILES: Record<string, string> = {
  lyra: '/models/lyra.vrm',
  lyra_casual: '/models/lyra_casual.vrm',
  lyra_dress: '/models/lyra_dress.vrm',
  '/models/lyra.vrm': '/models/lyra.vrm',
  '/models/lyra_casual.vrm': '/models/lyra_casual.vrm',
  '/models/lyra_dress.vrm': '/models/lyra_dress.vrm',
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

  const url = MODEL_FILES[modelId] || modelId;
  if (!url) throw new Error(`Unknown model id: ${modelId}`);

  const loadPromise = (async () => {
    let arrayBuffer: ArrayBuffer | null = null;
    const candidates = [
      url,
      ...(url.startsWith('/models/') ? [`https://raw.githubusercontent.com/Pro-Prince/Lyra/main/public${url}`] : [])
    ];

    let lastError: any = null;
    for (const candidate of candidates) {
      try {
        const resp = await fetch(candidate);
        if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${candidate}`);
        arrayBuffer = await resp.arrayBuffer();
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!arrayBuffer) {
      throw lastError || new Error(`Failed to fetch model from ${url}`);
    }

    // Binary GLB padding safeguard
    if (arrayBuffer.byteLength >= 20) {
      const dv = new DataView(arrayBuffer);
      const magic = dv.getUint32(0, true);
      if (magic === 0x46546c67) { // 'glTF'
        const totalLength = dv.getUint32(8, true);
        if (arrayBuffer.byteLength < totalLength) {
          console.warn(`[loadCompanionModel] Padded buffer for ${url} (${arrayBuffer.byteLength} -> ${totalLength} bytes)`);
          const padded = new Uint8Array(totalLength);
          padded.set(new Uint8Array(arrayBuffer), 0);
          arrayBuffer = padded.buffer;
        }
      }
    }

    const loader = createLoader();
    const gltf = await new Promise<any>((resolve, reject) => {
      loader.parse(
        arrayBuffer!,
        url,
        (result) => resolve(result),
        (err) => reject(err)
      );
    });

    const vrm = gltf.userData.vrm as VRM;
    if (!vrm) throw new Error(`No VRM instance found in loaded model at: ${url}`);

    // Prevent premature frustum culling on animated skinned meshes
    vrm.scene.traverse((child) => {
      if (!child.parent) child.parent = null;
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).frustumCulled = false;
      }
    });

    applyRestPose(vrm);
    applyRelaxedHandPose(vrm, 'left');
    applyRelaxedHandPose(vrm, 'right');
    vrm.humanoid?.update();
    return vrm;
  })();

  const timeoutPromise = new Promise<VRM>((_, reject) =>
    setTimeout(() => reject(new Error(`Timed out loading ${modelId} after ${LOAD_TIMEOUT_MS}ms`)), LOAD_TIMEOUT_MS)
  );

  const vrm = await Promise.race([loadPromise, timeoutPromise]);
  modelCache[modelId] = vrm;
  // Cache by both alias and URL
  for (const [k, v] of Object.entries(MODEL_FILES)) {
    if (v === url || k === modelId) {
      modelCache[k] = vrm;
    }
  }
  return vrm;
}

export function isModelCached(modelId: string): boolean {
  return !!modelCache[modelId];
}

export async function renderStaticPortrait(
  modelId: string,
  renderer?: THREE.WebGLRenderer,
  { frame = 'full-body', size = 256 }: { frame?: 'full-body' | 'portrait' | 'outfit'; size?: number } = {}
): Promise<string> {
  const vrm = await loadCompanionModel(modelId); // same cached loader, same pose guarantees
  const scene = new THREE.Scene();
  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(1, 2, 2);
  scene.add(ambient, key, vrm.scene);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 10);
  if (frame === 'full-body') {
    frameFullBody(vrm.scene, camera, size, 0, 0);
  } else if (frame === 'outfit') {
    frameOutfit(vrm.scene, camera, size);
  } else {
    framePortrait(vrm.scene, camera, size);
  }

  const shouldDispose = !renderer;
  const r = renderer || new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(size, size);
  vrm.update(0);
  r.render(scene, camera);
  const dataUrl = r.domElement.toDataURL('image/png');
  scene.remove(vrm.scene);

  if (shouldDispose) {
    try {
      r.forceContextLoss?.();
      r.getContext()?.getExtension('WEBGL_lose_context')?.loseContext();
      r.dispose();
    } catch {}
  }
  return dataUrl;
}
