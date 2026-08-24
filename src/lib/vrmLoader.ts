import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';
import * as THREE from 'three';

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

export async function loadVRM(url: string, renderer?: THREE.WebGLRenderer): Promise<VRM> {
  let arrayBuffer = bufferCache.get(url);

  if (!arrayBuffer) {
    if (!pendingFetches.has(url)) {
      const fetchPromise = (async () => {
        console.log('[loadVRM] Fetching model:', url);
        // Append version query parameter to bypass stale browser disk cache
        const cacheBustUrl = `${url}?v=${Date.now()}`;
        const res = await fetch(cacheBustUrl, { cache: 'no-cache' });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} when fetching model at ${url}`);
        }
        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        if (contentType.includes('text/html')) {
          throw new Error(`Server returned text/html instead of binary model for ${url}`);
        }
        const buf = await res.arrayBuffer();

        // Validate magic bytes before parsing
        const uint8 = new Uint8Array(buf);
        const magic = String.fromCharCode(uint8[0], uint8[1], uint8[2], uint8[3]);
        if (magic !== 'glTF' && uint8[0] !== 0x7b) {
          throw new Error(`Invalid model format at ${url}: expected glTF binary or JSON, got magic '${magic}'`);
        }

        bufferCache.set(url, buf);
        pendingFetches.delete(url);
        return buf;
      })().catch((err) => {
        pendingFetches.delete(url);
        bufferCache.delete(url);
        throw err;
      });
      pendingFetches.set(url, fetchPromise);
    }
    arrayBuffer = await pendingFetches.get(url)!;
  }

  console.log(`[loadVRM] Parsing cached buffer for ${url} (${(arrayBuffer.byteLength / 1024).toFixed(1)} KB)...`);

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
          bufferCache.delete(url);
          reject(new Error(`No VRM found in model at ${url} (gltf.userData.vrm is missing)`));
          return;
        }
        if (!vrm.humanoid) {
          bufferCache.delete(url);
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
        bufferCache.delete(url);
        reject(err);
      }
    );
  });
}
