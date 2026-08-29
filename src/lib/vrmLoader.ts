import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';
import * as THREE from 'three';

export interface ModelPathConfig {
  local: string;
  fallback: string;
}

export const VRM_MODEL_MAP: Record<string, ModelPathConfig> = {
  '/models/lyra.vrm': {
    local: '/models/lyra.vrm',
    fallback: 'https://raw.githubusercontent.com/Pro-Prince/Lyra/main/public/models/lyra.vrm',
  },
  '/models/lyra_casual.vrm': {
    local: '/models/lyra_casual.vrm',
    fallback: 'https://raw.githubusercontent.com/Pro-Prince/Lyra/main/public/models/lyra_casual.vrm',
  },
  '/models/lyra_dress.vrm': {
    local: '/models/lyra_dress.vrm',
    fallback: 'https://raw.githubusercontent.com/Pro-Prince/Lyra/main/public/models/lyra_dress.vrm',
  },
  'lyra': {
    local: '/models/lyra.vrm',
    fallback: 'https://raw.githubusercontent.com/Pro-Prince/Lyra/main/public/models/lyra.vrm',
  },
  'lyra_casual': {
    local: '/models/lyra_casual.vrm',
    fallback: 'https://raw.githubusercontent.com/Pro-Prince/Lyra/main/public/models/lyra_casual.vrm',
  },
  'lyra_dress': {
    local: '/models/lyra_dress.vrm',
    fallback: 'https://raw.githubusercontent.com/Pro-Prince/Lyra/main/public/models/lyra_dress.vrm',
  },
};

/**
 * Detects if the app is currently running in the Google AI Studio preview sandbox.
 */
export function isAiStudioSandbox(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const host = window.location.hostname || '';
    const isIframe = window.self !== window.top;
    return (
      host.includes('googleusercontent.com') ||
      host.includes('run.app') ||
      host.includes('aistudio') ||
      host.includes('ai.studio') ||
      isIframe
    );
  } catch {
    return true;
  }
}

/**
 * Resolves a model path to the local path.
 */
export function resolveModelUrl(inputUrl: string): string {
  const matchedKey = Object.keys(VRM_MODEL_MAP).find(
    (key) => inputUrl === key || inputUrl.endsWith(key) || inputUrl.includes(key)
  );

  if (matchedKey) {
    const config = VRM_MODEL_MAP[matchedKey];
    return config.local;
  }

  return inputUrl;
}

/**
 * Gets candidate URLs in priority order for fetching with automatic fallback.
 */
function getCandidateUrls(inputUrl: string): string[] {
  const matchedKey = Object.keys(VRM_MODEL_MAP).find(
    (key) => inputUrl === key || inputUrl.endsWith(key) || inputUrl.includes(key)
  );

  if (matchedKey) {
    const config = VRM_MODEL_MAP[matchedKey];
    return [config.local, config.fallback];
  }

  return [inputUrl];
}

let ktx2LoaderInstance: KTX2Loader | null = null;

function getKTX2Loader(renderer?: THREE.WebGLRenderer): KTX2Loader {
  if (!ktx2LoaderInstance) {
    ktx2LoaderInstance = new KTX2Loader();
    ktx2LoaderInstance.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/libs/basis/');
    if (renderer) {
      ktx2LoaderInstance.detectSupport(renderer);
    }
  }
  return ktx2LoaderInstance;
}

const bufferCache = new Map<string, ArrayBuffer>();
const pendingFetches = new Map<string, Promise<ArrayBuffer>>();

async function fetchModelBuffer(targetUrl: string): Promise<ArrayBuffer> {
  console.log('[loadVRM] Fetching model:', targetUrl);
  const cacheBustUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
  const res = await fetch(cacheBustUrl, { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} when fetching model at ${targetUrl}`);
  }
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('text/html')) {
    throw new Error(`Server returned text/html instead of binary model for ${targetUrl}`);
  }
  let buf = await res.arrayBuffer();

  // Validate magic bytes before parsing
  if (buf.byteLength < 12) {
    throw new Error(`File at ${targetUrl} is too short to be a valid model (${buf.byteLength} bytes)`);
  }

  const uint8 = new Uint8Array(buf);
  const magic = String.fromCharCode(uint8[0], uint8[1], uint8[2], uint8[3]);
  if (magic !== 'glTF' && uint8[0] !== 0x7b) {
    throw new Error(`Invalid model format at ${targetUrl}: expected glTF binary or JSON, got magic '${magic}'`);
  }

  // If binary glTF (GLB), ensure buffer matches full expected chunk size
  if (magic === 'glTF' && buf.byteLength >= 20) {
    const dataView = new DataView(buf);
    const totalLength = dataView.getUint32(8, true);
    const jsonLength = dataView.getUint32(12, true);

    try {
      if (buf.byteLength < totalLength) {
        console.warn(`[loadVRM] Padded buffer from ${targetUrl} (${buf.byteLength} bytes -> ${totalLength} bytes)`);
        const paddedArray = new Uint8Array(totalLength);
        paddedArray.set(new Uint8Array(buf), 0);
        buf = paddedArray.buffer as ArrayBuffer;
      }
    } catch (e) {
      console.warn(`[loadVRM] Error during buffer length check for ${targetUrl}:`, e);
    }
  }

  return buf;
}

export async function loadVRM(url: string, renderer?: THREE.WebGLRenderer): Promise<VRM> {
  const cacheKey = url;
  let arrayBuffer = bufferCache.get(cacheKey);

  if (!arrayBuffer) {
    if (!pendingFetches.has(cacheKey)) {
      const fetchPromise = (async () => {
        const candidates = getCandidateUrls(url);
        let lastError: Error | null = null;

        for (const candidate of candidates) {
          try {
            const buf = await fetchModelBuffer(candidate);
            bufferCache.set(cacheKey, buf);
            pendingFetches.delete(cacheKey);
            return buf;
          } catch (err: any) {
            console.warn(`[loadVRM] Fetch failed for candidate ${candidate}, trying next if available:`, err?.message || err);
            lastError = err instanceof Error ? err : new Error(String(err));
          }
        }

        throw lastError || new Error(`Failed to load VRM model from all candidate sources for ${url}`);
      })().catch((err) => {
        pendingFetches.delete(cacheKey);
        bufferCache.delete(cacheKey);
        throw err;
      });
      pendingFetches.set(cacheKey, fetchPromise);
    }
    arrayBuffer = await pendingFetches.get(cacheKey)!;
  }

  console.log(`[loadVRM] Parsing model buffer for ${url} (${(arrayBuffer.byteLength / 1024).toFixed(1)} KB)...`);

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  
  const ktx2 = getKTX2Loader(renderer);
  loader.setKTX2Loader(ktx2);
  loader.setMeshoptDecoder(MeshoptDecoder);

  const resourcePath = url.includes('/') ? url.substring(0, url.lastIndexOf('/') + 1) : '/models/';

  return new Promise<VRM>((resolve, reject) => {
    loader.parse(
      arrayBuffer.slice(0),
      resourcePath,
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM;
        if (!vrm) {
          bufferCache.delete(cacheKey);
          reject(new Error(`No VRM found in model at ${url} (gltf.userData.vrm is missing)`));
          return;
        }
        if (!vrm.humanoid) {
          bufferCache.delete(cacheKey);
          reject(new Error(`VRM at ${url} does not contain a humanoid rig`));
          return;
        }

        vrm.scene.traverse((child) => {
          if (!child.parent) {
            child.parent = null;
          }
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            // Skinned meshes in VRMs with animated bones should not be prematurely frustum-culled
            mesh.frustumCulled = false;
            if (mesh.geometry) {
              mesh.geometry.computeVertexNormals();
            }
          }
        });
        vrm.scene.updateMatrixWorld(true);

        console.log(`[loadVRM] Successfully parsed and initialized ${url}`);
        resolve(vrm);
      },
      (err) => {
        console.error(`[loadVRM] GLTFLoader parse error for ${url}:`, err);
        bufferCache.delete(cacheKey);
        reject(err);
      }
    );
  });
}
