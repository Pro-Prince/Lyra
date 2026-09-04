import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';
import { applyRestPose, applyRelaxedHandPose, frameFullBody, framePortrait, frameOutfit } from './poseUtils';

// Global safety guard for Three.js Object3D matrixWorld updates across all VRM/Canvas scenes
if (typeof window !== 'undefined' && THREE.Object3D) {
  const originalUpdateMatrixWorld = THREE.Object3D.prototype.updateMatrixWorld;
  THREE.Object3D.prototype.updateMatrixWorld = function (force?: boolean) {
    if (this.parent === undefined) this.parent = null;
    if (!this.matrixWorld) this.matrixWorld = new THREE.Matrix4();
    if (!this.matrix) this.matrix = new THREE.Matrix4();
    try {
      originalUpdateMatrixWorld.call(this, force);
    } catch (err) {
      console.warn('[THREE.Object3D.updateMatrixWorld] Handled matrix exception:', err);
    }
  };

  const originalUpdateWorldMatrix = THREE.Object3D.prototype.updateWorldMatrix;
  if (originalUpdateWorldMatrix) {
    THREE.Object3D.prototype.updateWorldMatrix = function (updateParents?: boolean, updateChildren?: boolean) {
      if (this.parent === undefined) this.parent = null;
      if (!this.matrixWorld) this.matrixWorld = new THREE.Matrix4();
      if (!this.matrix) this.matrix = new THREE.Matrix4();
      try {
        originalUpdateWorldMatrix.call(this, updateParents, updateChildren);
      } catch (err) {
        console.warn('[THREE.Object3D.updateWorldMatrix] Handled matrix exception:', err);
      }
    };
  }
}

export const MODEL_FILES: Record<string, string> = {
  lyra: '/models/lyra.vrm',
  lyra_casual: '/models/lyra_casual.vrm',
  lyra_dress: '/models/lyra_dress.vrm',
  normal: '/models/lyra.vrm',
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

export type OutfitId = 'default' | 'lyra_casual' | 'lyra_dress';

export interface OutfitDefinition {
  id: OutfitId;
  label: string;
  description: string;
  modelUrl: string;
}

export const OUTFIT_LIST: OutfitDefinition[] = [
  {
    id: 'default',
    label: 'Default',
    description: 'Signature tailored look with warm accents',
    modelUrl: '/models/lyra.vrm',
  },
  {
    id: 'lyra_casual',
    label: 'Casual',
    description: 'Comfortable knitwear and relaxed styling',
    modelUrl: '/models/lyra_casual.vrm',
  },
  {
    id: 'lyra_dress',
    label: 'Dress',
    description: 'Elegant evening dress with flowing silhouette',
    modelUrl: '/models/lyra_dress.vrm',
  },
];

export function normalizeOutfitId(outfit?: string | null): OutfitId {
  if (!outfit) return 'default';
  const clean = outfit.trim().toLowerCase();
  if (clean === 'lyra_casual' || clean === 'casual' || clean.includes('casual')) return 'lyra_casual';
  if (clean === 'lyra_dress' || clean === 'dress' || clean.includes('dress')) return 'lyra_dress';
  return 'default';
}

export function getOutfitUrl(outfit?: string | null): string {
  const id = normalizeOutfitId(outfit);
  return MODEL_FILES[id] || '/models/lyra.vrm';
}

export function getOutfitLabel(outfit?: string | null): string {
  const id = normalizeOutfitId(outfit);
  const found = OUTFIT_LIST.find((o) => o.id === id);
  return found ? found.label : 'Default';
}

export function isSameOutfit(a?: string | null, b?: string | null): boolean {
  return normalizeOutfitId(a) === normalizeOutfitId(b);
}

const LOAD_TIMEOUT_MS = 12000; // hard ceiling, this is what prevents "loading forever"
const rawBufferCache: Map<string, ArrayBuffer> = new Map();
const inFlightBufferPromises: Map<string, Promise<ArrayBuffer>> = new Map();

function createLoader() {
  const loader = new GLTFLoader();
  loader.setCrossOrigin('anonymous');
  loader.register((parser) => new VRMLoaderPlugin(parser));
  return loader;
}

export function safeUpdateVRM(vrm: VRM | null | undefined, delta: number): void {
  if (!vrm || !vrm.scene) return;
  try {
    // Sanitize node parent references: replace undefined with null
    vrm.scene.traverse((child: THREE.Object3D) => {
      if (child.parent === undefined) {
        child.parent = null;
      }
      if (!child.matrixWorld) {
        child.matrixWorld = new THREE.Matrix4();
      }
      if (!child.matrix) {
        child.matrix = new THREE.Matrix4();
      }
    });

    if (vrm.lookAt?.target) {
      if (vrm.lookAt.target.parent === undefined) {
        vrm.lookAt.target.parent = null;
      }
      if (!vrm.lookAt.target.matrixWorld) {
        vrm.lookAt.target.matrixWorld = new THREE.Matrix4();
      }
      if (!vrm.lookAt.target.matrix) {
        vrm.lookAt.target.matrix = new THREE.Matrix4();
      }
    }

    vrm.update(delta);
  } catch (err) {
    console.warn('[safeUpdateVRM] Handled VRM update exception:', err);
  }
}

export function safeUpdateMatrixWorld(obj: THREE.Object3D | null | undefined): void {
  if (!obj) return;
  try {
    obj.traverse((child: THREE.Object3D) => {
      if (child.parent === undefined) {
        child.parent = null;
      }
      if (!child.matrixWorld) {
        child.matrixWorld = new THREE.Matrix4();
      }
      if (!child.matrix) {
        child.matrix = new THREE.Matrix4();
      }
    });

    let tempScene: THREE.Scene | null = null;
    if (!obj.parent) {
      tempScene = new THREE.Scene();
      tempScene.add(obj);
    }
    obj.updateMatrixWorld(true);
    if (tempScene) {
      tempScene.remove(obj);
    }
  } catch (err) {
    console.warn('[safeUpdateMatrixWorld] Handled non-fatal matrix update exception:', err);
  }
}

export function safeSetFromObject(box: THREE.Box3, object: THREE.Object3D): THREE.Box3 {
  try {
    let tempScene: THREE.Scene | null = null;
    if (!object.parent) {
      tempScene = new THREE.Scene();
      tempScene.add(object);
    }
    safeUpdateMatrixWorld(object);
    box.setFromObject(object);
    if (tempScene) {
      tempScene.remove(object);
    }
  } catch (err) {
    console.warn('[safeSetFromObject] Handled setFromObject exception, using fallback box:', err);
    box.set(new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 1.8, 0.5));
  }
  return box;
}

async function fetchCompanionBuffer(url: string): Promise<ArrayBuffer> {
  if (rawBufferCache.has(url)) {
    return rawBufferCache.get(url)!;
  }
  if (inFlightBufferPromises.has(url)) {
    return inFlightBufferPromises.get(url)!;
  }

  const promise = (async () => {
    const urlWithVersion = `${url}${url.includes('?') ? '&' : '?'}v=lyra-3d-v3`;
    const candidates = [
      urlWithVersion,
      url,
      ...(typeof window !== 'undefined' && url.startsWith('/') ? [`${window.location.origin}${urlWithVersion}`] : []),
    ];

    let lastError: any = null;
    let arrayBuffer: ArrayBuffer | null = null;

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

    rawBufferCache.set(url, arrayBuffer);
    return arrayBuffer;
  })();

  inFlightBufferPromises.set(url, promise);
  try {
    return await promise;
  } finally {
    inFlightBufferPromises.delete(url);
  }
}

export async function loadCompanionModel(modelId: string): Promise<VRM> {
  const url = MODEL_FILES[modelId] || modelId;
  console.log('Attempting to load:', url);

  try {
    const loader = createLoader();
    const gltf = await loader.loadAsync(url);
    console.log('GLTF loaded successfully for', url);

    const vrm = gltf.userData.vrm;
    if (!vrm) {
      console.error('GLTF loaded but no VRM data found in userData.vrm. This file may not be a valid VRM export.');
      throw new Error('No VRM data in loaded file');
    }

    console.log('VRM extracted successfully for', url);
    return vrm as VRM;
  } catch (err: any) {
    console.error('FULL ERROR loading', url, ':', err?.message || String(err));
    if (err?.stack) console.error('Error stack:', err.stack);
    throw err;
  }
}

export function isModelCached(modelId: string): boolean {
  const url = MODEL_FILES[modelId] || modelId;
  return rawBufferCache.has(url);
}

export async function renderStaticPortrait(
  modelId: string,
  renderer?: THREE.WebGLRenderer,
  { frame = 'full-body', size = 256 }: { frame?: 'full-body' | 'portrait' | 'outfit'; size?: number } = {}
): Promise<string> {
  const vrm = await loadCompanionModel(modelId);
  const scene = new THREE.Scene();
  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  const key = new THREE.DirectionalLight(0xffffff, 0.65);
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
  safeUpdateVRM(vrm, 0);
  r.render(scene, camera);
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
