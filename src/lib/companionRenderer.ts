import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';
import { applyRestPose, applyRelaxedHandPose, frameFullBody, framePortrait, frameOutfit } from './poseUtils';

export const MODEL_FILES: Record<string, string> = {
  lyra: '/models/lyra.vrm',
  lyra_casual: '/models/lyra_casual.vrm',
  lyra_dress: '/models/lyra_dress.vrm',
  default: '/models/lyra.vrm',
  casual: '/models/lyra_casual.vrm',
  dress: '/models/lyra_dress.vrm',
  'models/lyra.vrm': '/models/lyra.vrm',
  'models/lyra_casual.vrm': '/models/lyra_casual.vrm',
  'models/lyra_dress.vrm': '/models/lyra_dress.vrm',
  '/models/lyra.vrm': '/models/lyra.vrm',
  '/models/lyra_casual.vrm': '/models/lyra_casual.vrm',
  '/models/lyra_dress.vrm': '/models/lyra_dress.vrm',
};

const LOAD_TIMEOUT_MS = 15000; // hard ceiling, this is what prevents "loading forever"
const modelCache: Record<string, VRM> = {}; // in-memory only, per session, no persistence layer
const inFlightPromises: Map<string, Promise<VRM>> = new Map();
const rawBufferCache: Map<string, ArrayBuffer> = new Map();

function createLoader() {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  return loader;
}

export async function loadCompanionModel(modelId: string): Promise<VRM> {
  const url = MODEL_FILES[modelId] || modelId;
  if (!url) throw new Error(`Unknown model id: ${modelId}`);

  // Return cached VRM instance if already fully loaded
  if (modelCache[url] || modelCache[modelId]) {
    return modelCache[url] || modelCache[modelId];
  }

  // Deduplicate in-flight requests for the same model
  if (inFlightPromises.has(url)) {
    return inFlightPromises.get(url)!;
  }

  const loadPromise = (async () => {
    let arrayBuffer: ArrayBuffer | null = rawBufferCache.get(url) || null;

    if (!arrayBuffer) {
      const urlWithVersion = `${url}${url.includes('?') ? '&' : '?'}v=lyra-3d-v2`;
      const candidates = [
        urlWithVersion,
        url,
        ...(typeof window !== 'undefined' && url.startsWith('/') ? [`${window.location.origin}${urlWithVersion}`] : []),
      ];

      let lastError: any = null;
      for (const candidate of candidates) {
        try {
          const resp = await fetch(candidate, { cache: 'no-store' });
          if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${candidate}`);
          const cType = resp.headers.get('content-type') || '';
          if (cType.includes('text/html')) {
            throw new Error(`Candidate returned HTML instead of binary: ${candidate}`);
          }
          const buf = await resp.arrayBuffer();
          if (buf.byteLength < 20) {
            throw new Error(`Invalid buffer length (${buf.byteLength}) from ${candidate}`);
          }
          const dv = new DataView(buf);
          const magic = dv.getUint32(0, true);
          if (magic !== 0x46546c67) { // 'glTF'
            throw new Error(`Invalid binary header magic (0x${magic.toString(16)}) from ${candidate}`);
          }
          arrayBuffer = buf;
          break;
        } catch (err) {
          lastError = err;
        }
      }

      if (!arrayBuffer) {
        throw lastError || new Error(`Failed to fetch valid VRM binary model from ${url}`);
      }

      // Binary GLB padding safeguard for header total length alignment
      if (arrayBuffer.byteLength >= 20) {
        const dv = new DataView(arrayBuffer);
        const magic = dv.getUint32(0, true);
        if (magic === 0x46546c67) { // 'glTF'
          const totalLength = dv.getUint32(8, true);
          if (arrayBuffer.byteLength < totalLength && totalLength <= 32 * 1024 * 1024) {
            try {
              const padded = new Uint8Array(totalLength);
              padded.set(new Uint8Array(arrayBuffer), 0);
              arrayBuffer = padded.buffer;
            } catch (allocErr) {
              console.warn(`[loadCompanionModel] Buffer padding allocation skipped for ${url}:`, allocErr);
            }
          }
        }
      }

      rawBufferCache.set(url, arrayBuffer);
    }

    const loader = createLoader();
    const parseBuffer = arrayBuffer.slice(0);
    const basePath = url.includes('/') ? url.substring(0, url.lastIndexOf('/') + 1) : '';
    const gltf = await new Promise<any>((resolve, reject) => {
      loader.parse(
        parseBuffer,
        basePath,
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

    modelCache[url] = vrm;
    modelCache[modelId] = vrm;
    for (const [k, v] of Object.entries(MODEL_FILES)) {
      if (v === url || k === modelId) {
        modelCache[k] = vrm;
      }
    }
    return vrm;
  })();

  const timeoutPromise = new Promise<VRM>((_, reject) =>
    setTimeout(() => reject(new Error(`Timed out loading ${modelId} after ${LOAD_TIMEOUT_MS}ms`)), LOAD_TIMEOUT_MS)
  );

  const sharedPromise = Promise.race([loadPromise, timeoutPromise]).finally(() => {
    inFlightPromises.delete(url);
  });

  inFlightPromises.set(url, sharedPromise);
  return sharedPromise;
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
