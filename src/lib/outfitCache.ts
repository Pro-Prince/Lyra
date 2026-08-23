import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { applyRestPose } from './poseUtils';
import { generateOutfitThumbnail, generateHeroPortrait, createThumbnailRenderer } from './thumbnailUtils';
import { loadVRM } from './vrmLoader';
import { loadMixamoAnimation } from './retargetMixamo';

export interface CachedOutfitEntry {
  vrm: VRM;
  thumbnail: string;
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

let cache: Record<string, CachedOutfitEntry> | null = null;
let loadingPromise: Promise<Record<string, CachedOutfitEntry>> | null = null;

export function preloadAllOutfits(caller = 'root'): Promise<Record<string, CachedOutfitEntry>> {
  console.log('preload triggered from', caller);
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const renderer = createThumbnailRenderer(800, 1000);
    const entries: [string, CachedOutfitEntry][] = [];

    // sequential, not Promise.all, so each load is fully isolated,
    // this is what actually prevents the Casual-shows-Default bug
    for (const [id, url] of Object.entries(OUTFIT_FILES)) {
      try {
        console.log('loading', id, url);
        console.log('generating thumbnail for', url);
        const vrm = await loadVRM(url);
        applyRestPose(vrm);
        const thumbnail = await generateOutfitThumbnail(vrm, renderer); // takes the loaded vrm directly, does not reload
        const heroPortrait = await generateHeroPortrait(vrm, renderer);

        if (id === 'lyra' && typeof window !== 'undefined') {
          try {
            localStorage.setItem('lyra_hero_portrait', heroPortrait);
          } catch {}
        }

        // Preload & retarget mixamo animations for this outfit
        const clips: Record<string, THREE.AnimationClip> = {};
        for (const file of MIXAMO_FILES) {
          try {
            const animUrl = new URL(`../assets/animations/mixamo/${file}.fbx`, import.meta.url).href;
            const clip = await loadMixamoAnimation(animUrl, vrm);
            if (clip) {
              clips[file] = clip;
            }
          } catch (err) {
            console.warn(`Failed to preload mixamo ${file} for outfit ${id}:`, err);
          }
        }

        const entry: CachedOutfitEntry = { vrm, thumbnail, heroPortrait, clips };
        entries.push([id, entry]);
        entries.push([url, entry]);
      } catch (err) {
        console.error(`Failed to preload outfit ${id} (${url}):`, err);
      }
    }

    try {
      renderer.dispose();
    } catch {
      // Ignore dispose errors
    }

    cache = Object.fromEntries(entries);
    console.log('[outfitCache] Cache resolved keys:', Object.keys(cache));
    return cache;
  })();

  return loadingPromise;
}

export function getCachedOutfit(id: string): CachedOutfitEntry | null {
  if (!cache) return null;
  if (cache[id]) return cache[id];

  // Try matching by normalized key or url
  const key = Object.keys(OUTFIT_FILES).find(
    (k) => k === id || OUTFIT_FILES[k] === id || id.includes(k)
  );
  if (key && cache[key]) return cache[key];

  return null;
}

export function isPreloadComplete(): boolean {
  return cache !== null && Object.keys(cache).length > 0;
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

