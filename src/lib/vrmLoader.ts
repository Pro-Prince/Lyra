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

  // 1x1 RGBA transparent PNG fallback
  const TRANSPARENT_1X1_PNG = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
  ]);

  // If binary glTF (GLB), ensure buffer is fully allocated to match header/chunks
  if (magic === 'glTF' && buf.byteLength >= 20) {
    const dataView = new DataView(buf);
    const totalLength = dataView.getUint32(8, true);
    const jsonLength = dataView.getUint32(12, true);

    try {
      const textDecoder = new TextDecoder('utf-8');
      const jsonStr = textDecoder.decode(new Uint8Array(buf, 20, Math.min(jsonLength, buf.byteLength - 20)));
      const gltf = JSON.parse(jsonStr);
      const expectedBinLength = gltf.buffers?.[0]?.byteLength || (totalLength - 20 - jsonLength - 8);
      const fullExpectedTotal = 20 + jsonLength + 8 + expectedBinLength;

      let workingArray: Uint8Array;
      if (buf.byteLength < fullExpectedTotal || buf.byteLength < totalLength) {
        console.warn(`[loadVRM] Repairing partially truncated GLB buffer from ${targetUrl} (${buf.byteLength} bytes -> ${fullExpectedTotal} bytes)`);
        const paddedArray = new Uint8Array(fullExpectedTotal);
        paddedArray.set(new Uint8Array(buf), 0);

        const paddedDataView = new DataView(paddedArray.buffer);
        paddedDataView.setUint32(8, fullExpectedTotal, true);
        paddedDataView.setUint32(20 + jsonLength, expectedBinLength, true);
        paddedArray[20 + jsonLength + 4] = 0x42; // 'B'
        paddedArray[20 + jsonLength + 5] = 0x49; // 'I'
        paddedArray[20 + jsonLength + 6] = 0x4e; // 'N'
        paddedArray[20 + jsonLength + 7] = 0x00; // '\0'
        workingArray = paddedArray;
      } else {
        workingArray = new Uint8Array(buf);
      }

      // Validate embedded images within the buffer
      if (Array.isArray(gltf.images)) {
        let modified = false;
        for (const img of gltf.images) {
          if (typeof img.bufferView === 'number' && gltf.bufferViews?.[img.bufferView]) {
            const bv = gltf.bufferViews[img.bufferView];
            const offset = 20 + jsonLength + 8 + (bv.byteOffset || 0);
            const byteLen = bv.byteLength || 0;
            if (offset + Math.min(byteLen, 8) <= workingArray.length) {
              const b0 = workingArray[offset];
              const b1 = workingArray[offset + 1];
              const b2 = workingArray[offset + 2];
              const b3 = workingArray[offset + 3];
              const isPng = b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47;
              const isJpg = b0 === 0xff && b1 === 0xd8 && b2 === 0xff;
              const isWebp = b0 === 0x52 && b1 === 0x49 && b2 === 0x46 && b3 === 0x46;
              if (!isPng && !isJpg && !isWebp) {
                workingArray.set(TRANSPARENT_1X1_PNG, offset);
                bv.byteLength = TRANSPARENT_1X1_PNG.length;
                modified = true;
              }
            }
          }
        }
        if (modified) {
          const newJsonStr = JSON.stringify(gltf).padEnd(jsonLength, ' ');
          const textEncoder = new TextEncoder();
          const encoded = textEncoder.encode(newJsonStr);
          workingArray.set(encoded.subarray(0, jsonLength), 20);
        }
      }

      buf = workingArray.buffer as ArrayBuffer;
    } catch (e) {
      console.warn(`[loadVRM] Error during buffer header check for ${targetUrl}:`, e);
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
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.frustumCulled = true;
            if (mesh.geometry) {
              mesh.geometry.computeVertexNormals();
            }
          }
        });

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
