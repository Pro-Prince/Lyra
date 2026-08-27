import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { applyRestPose, applyRelaxedHandPose, frameFullBody, framePortrait, frameOutfit } from './poseUtils';
import { createThumbnailRenderer } from './thumbnailUtils';
import { loadVRM } from './vrmLoader';
import { loadMixamoAnimation } from './retargetMixamo';

export interface CachedOutfitEntry {
  vrm: VRM;
  thumbnail: string;
  fullBodyRender?: string;
  heroPortrait?: string;
  clips: Record<string, THREE.AnimationClip>;
}

export const OUTFIT_FILES: Record<string, string> = {
  lyra: '/models/lyra.vrm',
  lyra_casual: '/models/lyra_casual.vrm',
  lyra_dress: '/models/lyra_dress.vrm',
};

const MIXAMO_FILES = [
  'idle',
  'walk_forward',
  'walk_backward',
  'turn_left',
  'turn_right',
  'dance',
  'strafe_left',
  'strafe_right',
  'turn_around',
];

// In-memory session-only caches (no localStorage, no IndexedDB, resets on tab close/refresh)
const renderCache: Record<string, string> = {};
const sessionVrmCache: Record<string, CachedOutfitEntry> = {};
let loadingPromise: Promise<Record<string, CachedOutfitEntry>> | null = null;

export async function renderPosedOutfit(
  vrmUrlOrInstance: string | VRM,
  renderer?: THREE.WebGLRenderer,
  { frame = 'outfit', size = 300 }: { frame?: 'full-body' | 'portrait' | 'outfit'; size?: number } = {}
): Promise<string> {
  const vrm = typeof vrmUrlOrInstance === 'string' ? await loadVRM(vrmUrlOrInstance) : vrmUrlOrInstance;
  
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

  vrm.scene.updateMatrixWorld(true);

  if (frame === 'full-body') {
    frameFullBody(vrm.scene, camera, height, 0, 0);
  } else if (frame === 'outfit') {
    frameOutfit(vrm.scene, camera, height);
  } else {
    framePortrait(vrm.scene, camera, size);
  }

  vrm.scene.updateMatrixWorld(true);

  const shouldDispose = !renderer;
  const r = renderer || createThumbnailRenderer(size, height);
  r.setSize(size, height);

  r.render(scene, camera);
  const dataUrl = r.domElement.toDataURL('image/png');
  scene.remove(vrm.scene);

  if (shouldDispose) {
    try { r.dispose(); } catch {}
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

  const url = OUTFIT_FILES[outfitId] || outfitId;
  console.log('Requesting:', url);
  try {
    const vrm = await loadVRM(url);
    console.log(`${url} loaded successfully`);
    applyRestPose(vrm);
    applyRelaxedHandPose(vrm, 'left');
    applyRelaxedHandPose(vrm, 'right');
    const result = await renderPosedOutfit(vrm, renderer, options);
    renderCache[cacheKey] = result;
    return result;
  } catch (err) {
    console.error(`${url} load failed:`, err);
    throw err;
  }
}

export function preloadAllOutfits(caller = 'root'): Promise<Record<string, CachedOutfitEntry>> {
  console.log('preload triggered from', caller);
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    for (const [id, url] of Object.entries(OUTFIT_FILES)) {
      try {
        console.log('Requesting:', url);
        const vrm = await loadVRM(url);
        console.log(`${url} loaded successfully`);
        
        applyRestPose(vrm);
        applyRelaxedHandPose(vrm, 'left');
        applyRelaxedHandPose(vrm, 'right');

        const thumbnail = await renderPosedOutfit(vrm, undefined, { frame: 'outfit', size: 320 });
        const fullBodyRender = await renderPosedOutfit(vrm, undefined, { frame: 'full-body', size: 380 });
        const heroPortrait = await renderPosedOutfit(vrm, undefined, { frame: 'portrait', size: 400 });

        // Preload idle animation
        const clips: Record<string, THREE.AnimationClip> = {};
        try {
          const idleUrl = new URL(`../assets/animations/mixamo/idle.fbx`, import.meta.url).href;
          const idleClip = await loadMixamoAnimation(idleUrl, vrm);
          if (idleClip) clips['idle'] = idleClip;
        } catch (err) {
          console.warn(`Failed to preload idle for outfit ${id}:`, err);
        }

        const entry: CachedOutfitEntry = { vrm, thumbnail, fullBodyRender, heroPortrait, clips };
        sessionVrmCache[id] = entry;
        sessionVrmCache[url] = entry;

        if (id === 'lyra' && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('lyraHeroReady', { detail: heroPortrait }));
        }

        // Load remaining animations asynchronously in background
        (async () => {
          for (const file of MIXAMO_FILES) {
            if (file === 'idle') continue;
            try {
              const animUrl = new URL(`../assets/animations/mixamo/${file}.fbx`, import.meta.url).href;
              const clip = await loadMixamoAnimation(animUrl, vrm);
              if (clip) {
                entry.clips[file] = clip;
              }
            } catch (err) {
              console.warn(`Failed to preload mixamo ${file} for outfit ${id}:`, err);
            }
          }
        })();

      } catch (err) {
        console.error(`Failed to preload outfit ${id} (${url}):`, err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lyraOutfitsReady'));
    }

    console.log('[outfitCache] In-memory session cache resolved keys:', Object.keys(sessionVrmCache));
    return sessionVrmCache;
  })();

  return loadingPromise;
}

export function getCachedOutfit(id: string): CachedOutfitEntry | null {
  if (sessionVrmCache[id]) return sessionVrmCache[id];

  const key = Object.keys(OUTFIT_FILES).find(
    (k) => k === id || OUTFIT_FILES[k] === id
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


