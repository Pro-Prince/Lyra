import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { applyRestPose, applyRelaxedHandPose, frameFullBody, framePortrait, frameOutfit } from './poseUtils';
import { createThumbnailRenderer } from './thumbnailUtils';
import { loadVRM } from './vrmLoader';
import { loadMixamoAnimation } from './retargetMixamo';
import { clearAllModelBuffers } from './vrmCache';

export interface CachedOutfitEntry {
  vrm: VRM;
  thumbnail: string;
  fullBodyRender?: string;
  heroPortrait?: string;
  clips: Record<string, THREE.AnimationClip>;
}

export const OUTFIT_FILES: Record<string, string> = {
  lyra: '/models/lyra.vrm?v=5',
  lyra_casual: '/models/lyra_casual.vrm?v=5',
  lyra_dress: '/models/lyra_dress.vrm?v=5',
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

const cache: Record<string, CachedOutfitEntry> = {};
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
  const ambient = new THREE.AmbientLight(0xfff5f8, 1.2);
  const key = new THREE.DirectionalLight(0xfff8f0, 1.3);
  key.position.set(1.5, 3.0, 2.5);
  const fill = new THREE.DirectionalLight(0xf0e6ff, 0.8);
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

export function preloadAllOutfits(caller = 'root'): Promise<Record<string, CachedOutfitEntry>> {
  console.log('preload triggered from', caller);
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    // Sequential load of VRMs to keep Three.js context clean
    for (const [id, url] of Object.entries(OUTFIT_FILES)) {
      try {
        console.log('loading', id, url);
        const vrm = await loadVRM(url);
        
        const thumbnail = await renderPosedOutfit(vrm, undefined, { frame: 'outfit', size: 320 });
        const fullBodyRender = await renderPosedOutfit(vrm, undefined, { frame: 'full-body', size: 380 });
        const heroPortrait = await renderPosedOutfit(vrm, undefined, { frame: 'portrait', size: 400 });

        // Preload essential idle animation first
        const clips: Record<string, THREE.AnimationClip> = {};
        try {
          const idleUrl = new URL(`../assets/animations/mixamo/idle.fbx`, import.meta.url).href;
          const idleClip = await loadMixamoAnimation(idleUrl, vrm);
          if (idleClip) clips['idle'] = idleClip;
        } catch (err) {
          console.warn(`Failed to preload idle for outfit ${id}:`, err);
        }

        const entry: CachedOutfitEntry = { vrm, thumbnail, fullBodyRender, heroPortrait, clips };
        cache[id] = entry;
        cache[url] = entry;

        if (id === 'lyra' && typeof window !== 'undefined') {
          try {
            if (heroPortrait && !heroPortrait.startsWith('blob:')) {
              localStorage.setItem('lyra_hero_portrait', heroPortrait);
            }
            window.dispatchEvent(new CustomEvent('lyraHeroReady', { detail: heroPortrait }));
          } catch {}
        }

        // Load remaining animations in background non-blockingly
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

    console.log('[outfitCache] Cache resolved keys:', Object.keys(cache));
    return cache;
  })();

  return loadingPromise;
}

export function getCachedOutfit(id: string): CachedOutfitEntry | null {
  if (cache[id]) return cache[id];

  // Try matching by normalized key or url
  const key = Object.keys(OUTFIT_FILES).find(
    (k) => k === id || OUTFIT_FILES[k] === id
  );
  if (key && cache[key]) return cache[key];

  return null;
}

export function clearOutfitCache(): void {
  for (const k of Object.keys(cache)) {
    delete cache[k];
  }
  loadingPromise = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('lyra_hero_portrait');
  }
}

// Invalidate stale caches from older builds
if (typeof window !== 'undefined') {
  const CACHE_VERSION = 'v5_lyra_vrm_default_fresh';
  if (localStorage.getItem('lyra_outfit_cache_version') !== CACHE_VERSION) {
    clearOutfitCache();
    clearAllModelBuffers().catch(() => {});
    localStorage.setItem('lyra_outfit_cache_version', CACHE_VERSION);
  }
}

export function isPreloadComplete(): boolean {
  return Object.keys(cache).length > 0;
}

export function getStoredHeroPortrait(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('lyra_hero_portrait');
  }
  return null;
}

export function getAllCachedThumbnails(): Record<string, string> {
  if (!cache) return {};
  const result: Record<string, string> = {};
  for (const [k, entry] of Object.entries(cache)) {
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

