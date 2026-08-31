import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { applyRestPose, applyRelaxedHandPose, frameFullBody, framePortrait, frameOutfit } from './poseUtils';
import { createThumbnailRenderer } from './thumbnailUtils';
import { loadCompanionModel, renderStaticPortrait, MODEL_FILES, safeUpdateMatrixWorld } from './companionRenderer';
import { loadMixamoAnimation } from './retargetMixamo';

export interface CachedOutfitEntry {
  vrm: VRM;
  thumbnail: string;
  fullBodyRender?: string;
  heroPortrait?: string;
  clips: Record<string, THREE.AnimationClip>;
}

export const OUTFIT_FILES = MODEL_FILES;

// In-memory session-only caches (no localStorage, no IndexedDB, resets on tab close/refresh)
const renderCache: Record<string, string> = {};
const sessionVrmCache: Record<string, CachedOutfitEntry> = {};
let loadingPromise: Promise<Record<string, CachedOutfitEntry>> | null = null;

export async function renderPosedOutfit(
  vrmUrlOrInstance: string | VRM,
  renderer?: THREE.WebGLRenderer,
  { frame = 'outfit', size = 300 }: { frame?: 'full-body' | 'portrait' | 'outfit'; size?: number } = {}
): Promise<string> {
  if (typeof vrmUrlOrInstance === 'string') {
    return renderStaticPortrait(vrmUrlOrInstance, renderer, { frame, size });
  }

  const vrm = vrmUrlOrInstance;
  applyRestPose(vrm);
  applyRelaxedHandPose(vrm, 'left');
  applyRelaxedHandPose(vrm, 'right');
  vrm.humanoid?.update();

  const scene = new THREE.Scene();
  const ambient = new THREE.AmbientLight(0xfff5f8, 2.5);
  const key = new THREE.DirectionalLight(0xfff8f0, 1.5);
  key.position.set(1.5, 3.0, 2.5);
  const fill = new THREE.DirectionalLight(0xf0e6ff, 0.9);
  fill.position.set(-1.5, 2.0, 2.0);
  scene.add(ambient, key, fill, vrm.scene);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 10);
  const height = Math.round(size * (frame === 'full-body' ? 1.35 : 1));
  camera.aspect = size / height;
  camera.updateProjectionMatrix();

  safeUpdateMatrixWorld(vrm.scene);

  if (frame === 'full-body') {
    frameFullBody(vrm.scene, camera, height, 0, 0);
  } else if (frame === 'outfit') {
    frameOutfit(vrm.scene, camera, height);
  } else {
    framePortrait(vrm.scene, camera, size);
  }

  safeUpdateMatrixWorld(vrm.scene);

  const shouldDispose = !renderer;
  const r = renderer || createThumbnailRenderer(size, height);
  r.setSize(size, height);

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

export async function getOutfitRender(
  outfitId: string,
  renderer?: THREE.WebGLRenderer,
  options?: { frame?: 'full-body' | 'portrait' | 'outfit'; size?: number }
): Promise<string> {
  const cacheKey = `${outfitId}_${options?.frame || 'outfit'}_${options?.size || 300}`;
  if (renderCache[cacheKey]) return renderCache[cacheKey];

  try {
    const result = await renderStaticPortrait(outfitId, renderer, options);
    renderCache[cacheKey] = result;
    return result;
  } catch (err) {
    console.error(`[getOutfitRender] Failed for ${outfitId}:`, err);
    throw err;
  }
}

export function preloadAllOutfits(caller = 'root'): Promise<Record<string, CachedOutfitEntry>> {
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    let batchRenderer: THREE.WebGLRenderer | null = null;
    try {
      batchRenderer = createThumbnailRenderer(300, 300);
    } catch (renderErr) {
      console.warn('[preloadAllOutfits] Batch renderer init skipped:', renderErr);
    }

    try {
      // Prioritize primary model first
      const outfitIds = ['lyra', 'lyra_casual', 'lyra_dress'];
      for (const id of outfitIds) {
        const url = MODEL_FILES[id];
        try {
          const vrm = await loadCompanionModel(id);

          let thumbnail = '';
          let fullBodyRender = '';
          let heroPortrait = '';

          if (batchRenderer) {
            try {
              thumbnail = await renderStaticPortrait(id, batchRenderer, { frame: 'outfit', size: 256 });
              heroPortrait = await renderStaticPortrait(id, batchRenderer, { frame: 'portrait', size: 256 });
              fullBodyRender = heroPortrait;
            } catch (rErr) {
              console.warn(`[preloadAllOutfits] Snapshot render skipped for ${id}:`, rErr);
            }
          }

          // Preload idle animation
          const clips: Record<string, THREE.AnimationClip> = {};
          try {
            const idleUrl = new URL(`../assets/animations/mixamo/idle.fbx`, import.meta.url).href;
            const idleClip = await loadMixamoAnimation(idleUrl, vrm);
            if (idleClip) clips['idle'] = idleClip;
          } catch (animErr) {
            // Silently ignore optional anim load failure
          }

          const entry: CachedOutfitEntry = { vrm, thumbnail, fullBodyRender, heroPortrait, clips };
          sessionVrmCache[id] = entry;
          sessionVrmCache[url] = entry;

          if (id === 'lyra' && heroPortrait && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('lyraHeroReady', { detail: heroPortrait }));
          }
        } catch (err) {
          console.warn(`[preloadAllOutfits] Skipped background preload for outfit ${id} (${url}):`, err);
        }
      }
    } finally {
      if (batchRenderer) {
        try {
          batchRenderer.forceContextLoss?.();
          batchRenderer.getContext()?.getExtension('WEBGL_lose_context')?.loseContext();
          batchRenderer.dispose();
        } catch {}
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lyraOutfitsReady'));
    }

    return sessionVrmCache;
  })();

  return loadingPromise;
}

export function getCachedOutfit(id: string): CachedOutfitEntry | null {
  if (sessionVrmCache[id]) return sessionVrmCache[id];

  const key = Object.keys(MODEL_FILES).find(
    (k) => k === id || MODEL_FILES[k] === id
  );
  if (key && sessionVrmCache[key]) return sessionVrmCache[key];

  return null;
}

export function clearOutfitCache(): void {
  for (const k of Object.keys(sessionVrmCache)) {
    delete sessionVrmCache[k];
  }
  for (const k of Object.keys(renderCache)) {
    delete renderCache[k];
  }
  loadingPromise = null;
}

export function isPreloadComplete(): boolean {
  return Object.keys(sessionVrmCache).length > 0;
}

export function getStoredHeroPortrait(): string | null {
  return sessionVrmCache['lyra']?.heroPortrait || null;
}

export function getAllCachedThumbnails(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, entry] of Object.entries(sessionVrmCache)) {
    result[k] = entry.thumbnail;
  }
  return result;
}

export function getAllFullBodyRenders(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const id of ['lyra', 'lyra_casual', 'lyra_dress']) {
    const entry = getCachedOutfit(id);
    if (entry?.fullBodyRender) {
      result[id] = entry.fullBodyRender;
    } else if (entry?.thumbnail) {
      result[id] = entry.thumbnail;
    }
  }
  return result;
}

export function useOutfitThumbnail(id: string): string | null {
  const [thumb, setThumb] = useState<string | null>(() => getCachedOutfit(id)?.thumbnail || null);

  useEffect(() => {
    let isMounted = true;
    const existing = getCachedOutfit(id)?.thumbnail;
    if (existing) {
      setThumb(existing);
      return;
    }

    preloadAllOutfits('useOutfitThumbnail').then(() => {
      if (isMounted) {
        setThumb(getCachedOutfit(id)?.thumbnail || null);
      }
    });

    const handleReady = () => {
      if (isMounted) {
        setThumb(getCachedOutfit(id)?.thumbnail || null);
      }
    };

    window.addEventListener('lyraOutfitsReady', handleReady);
    return () => {
      isMounted = false;
      window.removeEventListener('lyraOutfitsReady', handleReady);
    };
  }, [id]);

  return thumb;
}

export function useOutfitRenders(): Record<string, string> {
  const [renders, setRenders] = useState<Record<string, string>>(() => getAllFullBodyRenders());

  useEffect(() => {
    let isMounted = true;
    preloadAllOutfits('useOutfitRenders').then(() => {
      if (isMounted) {
        setRenders(getAllFullBodyRenders());
      }
    });

    const handleReady = () => {
      if (isMounted) {
        setRenders(getAllFullBodyRenders());
      }
    };

    window.addEventListener('lyraOutfitsReady', handleReady);
    return () => {
      isMounted = false;
      window.removeEventListener('lyraOutfitsReady', handleReady);
    };
  }, []);

  return renders;
}
