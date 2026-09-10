/**
 * Lyra Three-Layer Personalization Storage Architecture
 * 
 * Layer 1: Profile - structured, small, permanent until explicitly reset.
 * Layer 2: Memories - distilled, durable facts, short (<= 20 words), timestamped.
 * Layer 3: Recent Context - the last several messages of the current conversation.
 * 
 * Future Supabase Interface Boundary:
 * All storage operations must go through these exported storage functions so swapping 
 * the storage backend touches only this module and no consuming components.
 */

export interface Profile {
  preferredName: string;
  conversationalVibe: string; // from onboarding
  topics: string[]; // from onboarding
  activeOutfit: string;
  voicePresetId: string;
  onboardingCompleted?: boolean;
}

export interface Memory {
  id: string;
  text: string; // one plain sentence, 20 words or fewer
  createdAt: string; // ISOString
}

export interface RecentMessage {
  id?: string;
  sender: 'user' | 'Lyra';
  text: string;
  timestamp?: number;
}

const DB_NAME = 'lyra-db';
const DB_VERSION = 2;

const DEFAULT_PROFILE: Profile = {
  preferredName: 'Friend',
  conversationalVibe: 'Warm & Gentle',
  topics: ['Daily Life', 'Mindfulness'],
  activeOutfit: '/models/lyra.vrm',
  voicePresetId: 'soft-calm',
};

function withMeta<T>(record: T & { id?: string; updatedAt?: string }): T & { id: string; updatedAt: string } {
  return {
    ...record,
    id: record?.id ?? crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
  };
}

function openLyraDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('IndexedDB not available in SSR'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile');
      }
      if (!db.objectStoreNames.contains('companion')) {
        db.createObjectStore('companion');
      }
      if (!db.objectStoreNames.contains('messages')) {
        db.createObjectStore('messages', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('memories')) {
        db.createObjectStore('memories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('notificationPreferences')) {
        db.createObjectStore('notificationPreferences');
      }
      if (!db.objectStoreNames.contains('localProfile')) {
        db.createObjectStore('localProfile');
      }
    };
  });
}

// ==========================================
// LAYER 1: PROFILE
// ==========================================

export async function getLocalProfileData(): Promise<Profile> {
  const db = await openLyraDB();
  return new Promise<Profile>((resolve, reject) => {
    const tx = db.transaction(['profile', 'companion', 'localProfile'], 'readonly');
    const profileStore = tx.objectStore('profile');
    const req = profileStore.get('current');

    req.onsuccess = () => {
      if (req.result) {
        resolve({
          preferredName: req.result.preferredName || DEFAULT_PROFILE.preferredName,
          conversationalVibe: req.result.conversationalVibe || DEFAULT_PROFILE.conversationalVibe,
          topics: Array.isArray(req.result.topics) ? req.result.topics : DEFAULT_PROFILE.topics,
          activeOutfit: req.result.activeOutfit || DEFAULT_PROFILE.activeOutfit,
          voicePresetId: req.result.voicePresetId || DEFAULT_PROFILE.voicePresetId,
        });
        return;
      }

      // Fallback migration check from legacy companion / localProfile stores
      const compReq = tx.objectStore('companion').get('current');
      compReq.onsuccess = () => {
        const comp = compReq.result || {};
        const localReq = tx.objectStore('localProfile').get('current');
        localReq.onsuccess = () => {
          const local = localReq.result || {};
          const fallback: Profile = {
            preferredName: comp.userPreferredName || comp.userName || local.name || DEFAULT_PROFILE.preferredName,
            conversationalVibe: comp.conversationalVibe || comp.vibe || DEFAULT_PROFILE.conversationalVibe,
            topics: Array.isArray(comp.interests) ? comp.interests : (Array.isArray(comp.topics) ? comp.topics : DEFAULT_PROFILE.topics),
            activeOutfit: comp.outfit || DEFAULT_PROFILE.activeOutfit,
            voicePresetId: comp.voicePreset || comp.voiceUri || DEFAULT_PROFILE.voicePresetId,
          };
          resolve(fallback);
        };
        localReq.onerror = () => resolve(DEFAULT_PROFILE);
      };
      compReq.onerror = () => resolve(DEFAULT_PROFILE);
    };

    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalProfileData(profile: Partial<Profile>): Promise<void> {
  const db = await openLyraDB();
  const current = await getLocalProfileData();
  const updated: Profile = {
    preferredName: profile.preferredName ?? current.preferredName,
    conversationalVibe: profile.conversationalVibe ?? current.conversationalVibe,
    topics: Array.isArray(profile.topics) ? profile.topics : current.topics,
    activeOutfit: profile.activeOutfit ?? current.activeOutfit,
    voicePresetId: profile.voicePresetId ?? current.voicePresetId,
  };

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['profile', 'companion', 'localProfile'], 'readwrite');
    const profileStore = tx.objectStore('profile');
    profileStore.put(withMeta(updated), 'current');

    // Also keep legacy stores in sync for backwards compatibility
    const compStore = tx.objectStore('companion');
    const compReq = compStore.get('current');
    compReq.onsuccess = () => {
      const existing = compReq.result || {};
      compStore.put(withMeta({
        ...existing,
        name: 'Lyra',
        userName: updated.preferredName,
        userPreferredName: updated.preferredName,
        conversationalVibe: updated.conversationalVibe,
        vibe: updated.conversationalVibe,
        interests: updated.topics,
        topics: updated.topics,
        outfit: updated.activeOutfit,
        voicePreset: updated.voicePresetId,
      }), 'current');
    };

    const localStore = tx.objectStore('localProfile');
    const localReq = localStore.get('current');
    localReq.onsuccess = () => {
      const existing = localReq.result || {};
      localStore.put(withMeta({
        ...existing,
        name: updated.preferredName,
      }), 'current');
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ==========================================
// LAYER 2: MEMORIES
// ==========================================

export function validateMemory(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount > 20) {
    console.warn('Memory too long, truncating or rejecting:', text);
    return false;
  }
  return true;
}

export function sanitizeMemoryText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let clean = text.trim();
  // Remove bullet points and surrounding quotes
  clean = clean.replace(/^[-*•]\s*/, '').replace(/^["']|["']$/g, '').trim();
  const words = clean.split(/\s+/);
  if (words.length > 20) {
    clean = words.slice(0, 20).join(' ') + '.';
  }
  if (!/[.!?]$/.test(clean)) {
    clean += '.';
  }
  return clean;
}

export async function getLocalMemories(): Promise<Memory[]> {
  const db = await openLyraDB();
  return new Promise<Memory[]>((resolve, reject) => {
    const tx = db.transaction('memories', 'readonly');
    const store = tx.objectStore('memories');
    const req = store.getAll();
    req.onsuccess = () => {
      const rawList = req.result || [];
      const normalized: Memory[] = rawList.map((m: any) => {
        const textVal = m.text || m.factSummary || m.content || '';
        return {
          id: m.id || crypto.randomUUID(),
          text: sanitizeMemoryText(textVal),
          createdAt: m.createdAt || m.timestamp || new Date().toISOString(),
        };
      }).filter((m: Memory) => m.text.length > 0);

      // Sort newest first
      normalized.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      resolve(normalized);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalMemory(memory: string | { id?: string; text?: string; content?: string; factSummary?: string; createdAt?: string | number; [key: string]: any }): Promise<void> {
  let memObj = typeof memory === 'string' ? { text: memory } : memory;
  const rawText = memObj.text || memObj.factSummary || memObj.content || '';
  if (!validateMemory(rawText)) {
    const sanitized = sanitizeMemoryText(rawText);
    if (!sanitized) {
      console.warn('Rejected invalid memory entry:', memory);
      return;
    }
  }

  const cleanText = sanitizeMemoryText(rawText);
  const db = await openLyraDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('memories', 'readwrite');
    const store = tx.objectStore('memories');
    const createdAtStr = typeof memObj.createdAt === 'number' 
      ? new Date(memObj.createdAt).toISOString() 
      : (memObj.createdAt || new Date().toISOString());

    const payload: Memory = {
      id: memObj.id || crypto.randomUUID(),
      text: cleanText,
      createdAt: createdAtStr,
    };
    const req = store.put(payload);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteLocalMemory(id: string): Promise<void> {
  const db = await openLyraDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('memories', 'readwrite');
    const store = tx.objectStore('memories');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// LAYER 3: RECENT CONTEXT
// ==========================================

export async function getRecentMessages(limit: number = 10): Promise<RecentMessage[]> {
  const db = await openLyraDB();
  return new Promise<RecentMessage[]>((resolve, reject) => {
    const tx = db.transaction('messages', 'readonly');
    const store = tx.objectStore('messages');
    const req = store.getAll();
    req.onsuccess = () => {
      let results = req.result || [];
      results.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      if (limit > 0 && results.length > limit) {
        results = results.slice(-limit);
      }
      const mapped: RecentMessage[] = results.map((m: any) => ({
        id: m.id,
        sender: (m.role === 'user' ? 'user' : 'Lyra') as 'user' | 'Lyra',
        text: String(m.content || m.text || '').trim(),
        timestamp: m.timestamp || (m.createdAt ? new Date(m.createdAt).getTime() : Date.now()),
      })).filter((m: RecentMessage) => m.text.length > 0);
      resolve(mapped);
    };
    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// COMPANION / MESSAGE COMPATIBILITY HELPERS
// ==========================================

export async function saveMessage(msg: any): Promise<void> {
  const db = await openLyraDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    const payload = withMeta({
      timestamp: msg.timestamp || Date.now(),
      ...msg,
    });
    const req = store.put(payload);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getMessages(limit?: number): Promise<any[]> {
  const db = await openLyraDB();
  return new Promise<any[]>((resolve, reject) => {
    const tx = db.transaction('messages', 'readonly');
    const store = tx.objectStore('messages');
    const req = store.getAll();
    req.onsuccess = () => {
      let results = req.result || [];
      results.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      if (limit && limit > 0) {
        results = results.slice(-limit);
      }
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getCompanion(): Promise<any> {
  const db = await openLyraDB();
  const local: any = await new Promise((resolve, reject) => {
    const tx = db.transaction('companion', 'readonly');
    const store = tx.objectStore('companion');
    const req = store.get('current');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });

  if (local && (local.outfit || local.userPreferredName || local.voiceUri)) {
    return local;
  }

  // If local store is empty or missing outfit (e.g. user logged in on a new device),
  // hydrate directly from cloud profile in Supabase
  try {
    const profile = await getProfile();
    if (profile && (profile.activeOutfit || profile.preferredName)) {
      const compData = {
        name: 'Lyra',
        userName: profile.preferredName,
        userPreferredName: profile.preferredName,
        vibe: profile.conversationalVibe,
        conversationalVibe: profile.conversationalVibe,
        interests: profile.topics,
        topics: profile.topics,
        outfit: profile.activeOutfit,
        voiceUri: profile.voicePresetId,
        voicePreset: profile.voicePresetId,
        initialized: true,
      };
      await saveCompanion(compData);
      return compData;
    }
  } catch (err) {
    console.warn('[storage] Could not hydrate companion from profile:', err);
  }

  return local || null;
}

export async function saveCompanion(data: any): Promise<void> {
  const db = await openLyraDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['companion', 'profile'], 'readwrite');
    const store = tx.objectStore('companion');
    const payload = withMeta(data);
    store.put(payload, 'current');

    // Keep profile store synced
    const profileStore = tx.objectStore('profile');
    profileStore.put(withMeta({
      preferredName: data.userPreferredName || data.userName || DEFAULT_PROFILE.preferredName,
      conversationalVibe: data.conversationalVibe || data.vibe || DEFAULT_PROFILE.conversationalVibe,
      topics: data.interests || data.topics || DEFAULT_PROFILE.topics,
      activeOutfit: data.outfit || DEFAULT_PROFILE.activeOutfit,
      voicePresetId: data.voicePreset || data.voiceUri || DEFAULT_PROFILE.voicePresetId,
    }), 'current');

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Automatically sync changes to Supabase public.profiles table
  const profileSync: Record<string, any> = {};
  if (data.outfit) profileSync.activeOutfit = data.outfit;
  if (data.voicePreset || data.voicePresetId || data.voiceUri) profileSync.voicePresetId = data.voicePreset || data.voicePresetId || data.voiceUri;
  if (data.userPreferredName || data.userName) profileSync.preferredName = data.userPreferredName || data.userName;
  if (data.conversationalVibe || data.vibe) profileSync.conversationalVibe = data.conversationalVibe || data.vibe;
  if (data.interests || data.topics) profileSync.topics = data.interests || data.topics;

  if (Object.keys(profileSync).length > 0) {
    saveProfile(profileSync).catch((err) => {
      console.warn('[storage] Companion sync to profile warning:', err);
    });
  }
}

export async function getNotificationPreferences(): Promise<any> {
  const db = await openLyraDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notificationPreferences', 'readonly');
    const store = tx.objectStore('notificationPreferences');
    const req = store.get('current');
    req.onsuccess = () => resolve(req.result || { enabled: false, time: '09:00', lastSentAt: null });
    req.onerror = () => reject(req.error);
  });
}

export async function saveNotificationPreferences(data: any): Promise<void> {
  const db = await openLyraDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('notificationPreferences', 'readwrite');
    const store = tx.objectStore('notificationPreferences');
    const payload = withMeta(data);
    const req = store.put(payload, 'current');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getLocalProfile(): Promise<any> {
  const db = await openLyraDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('localProfile', 'readonly');
    const store = tx.objectStore('localProfile');
    const req = store.get('current');
    req.onsuccess = () => resolve(req.result || { birthdate: null, adultConfirmed: false });
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalProfile(data: any): Promise<void> {
  const db = await openLyraDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('localProfile', 'readwrite');
    const store = tx.objectStore('localProfile');
    const payload = withMeta(data);
    const req = store.put(payload, 'current');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllMessages(): Promise<void> {
  const db = await openLyraDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearLocalMemories(): Promise<void> {
  const db = await openLyraDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('memories', 'readwrite');
    const store = tx.objectStore('memories');
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearLocalProfile(): Promise<void> {
  const db = await openLyraDB();
  const profileStores = ['profile', 'companion', 'localProfile', 'notificationPreferences'];
  for (const storeName of profileStores) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

// ==========================================
// SUPABASE / LOCAL FALLBACK WRAPPERS
// ==========================================

import { supabase } from './supabaseClient';

export async function getProfile() {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!error && data) {
        const googleName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
        const preferredName = data.preferred_name || googleName || '';

        const profileData = {
          preferredName: preferredName || DEFAULT_PROFILE.preferredName,
          conversationalVibe: data.conversational_vibe || DEFAULT_PROFILE.conversationalVibe,
          topics: Array.isArray(data.topics) && data.topics.length > 0 ? data.topics : DEFAULT_PROFILE.topics,
          activeOutfit: data.active_outfit || DEFAULT_PROFILE.activeOutfit,
          voicePresetId: data.voice_preset_id || DEFAULT_PROFILE.voicePresetId,
          onboardingCompleted: Boolean(data.onboarding_completed),
        };

        // Cache locally for offline availability & immediate rendering
        try {
          await saveLocalProfileData(profileData);
        } catch {}

        return profileData;
      }

      // Check Google account name metadata fallback
      const googleName = session.user.user_metadata?.full_name || session.user.user_metadata?.name;
      if (googleName) {
        const local = await getLocalProfileData();
        return {
          ...local,
          preferredName: local.preferredName && local.preferredName !== 'Friend' ? local.preferredName : googleName,
        };
      }
    }
  } catch (err) {
    console.warn('[storage] Remote profile fetch failed, using local:', err);
  }

  return getLocalProfileData();
}

export async function saveProfile(updates: any) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      // ONLY valid columns for public.profiles:
      // (id, preferred_name, conversational_vibe, topics, active_outfit, voice_preset_id, onboarding_completed, updated_at)
      const payload: Record<string, any> = {
        id: session.user.id,
        updated_at: new Date().toISOString(),
      };

      const preferredName = updates.preferredName ?? updates.preferred_name;
      if (preferredName !== undefined) payload.preferred_name = preferredName;

      const conversationalVibe = updates.conversationalVibe ?? updates.conversational_vibe ?? updates.vibe;
      if (conversationalVibe !== undefined) payload.conversational_vibe = conversationalVibe;

      const topics = updates.topics ?? updates.interests;
      if (topics !== undefined) payload.topics = Array.isArray(topics) ? topics : [];

      const activeOutfit = updates.activeOutfit ?? updates.active_outfit ?? updates.outfit;
      if (activeOutfit !== undefined) payload.active_outfit = activeOutfit;

      const voicePresetId = updates.voicePresetId ?? updates.voice_preset_id ?? updates.voicePreset ?? updates.voiceUri;
      if (voicePresetId !== undefined) payload.voice_preset_id = voicePresetId;

      const onboardingCompleted = updates.onboardingCompleted ?? updates.onboarding_completed;
      if (onboardingCompleted !== undefined) payload.onboarding_completed = Boolean(onboardingCompleted);

      // Upsert profile record in Supabase matching public.profiles schema
      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.error('[storage] Supabase profiles upsert error:', error);
      }
    }
  } catch (err) {
    console.warn('[storage] Remote profile save failed, using local:', err);
  }

  if (typeof window !== 'undefined') {
    const pName = updates.preferredName ?? updates.preferred_name;
    if (pName) {
      localStorage.setItem('lyra_user_name', pName);
    }
    const oComp = updates.onboardingCompleted ?? updates.onboarding_completed;
    if (oComp !== undefined) {
      localStorage.setItem('lyra_onboarding_completed', oComp ? 'true' : 'false');
    }
  }

  return saveLocalProfileData(updates);
}

export async function isOnboardingCompleted(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // If authenticated, Supabase is the absolute source of truth
    if (session) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!error && profile) {
        const isCompleted = Boolean(profile.onboarding_completed);
        if (typeof window !== 'undefined') {
          localStorage.setItem('lyra_onboarding_completed', isCompleted ? 'true' : 'false');
        }
        return isCompleted;
      }
      return false;
    }
  } catch {}

  // For guest mode
  if (typeof window !== 'undefined' && localStorage.getItem('lyra_onboarding_completed') === 'true') {
    return true;
  }

  try {
    const localProfile = await getLocalProfile();
    const companion = await getCompanion();
    if (localProfile?.initialized && companion?.initialized && (localProfile?.name || companion?.userName)) {
      if (typeof window !== 'undefined') localStorage.setItem('lyra_onboarding_completed', 'true');
      return true;
    }
  } catch {}

  return false;
}

export async function getMemories() {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const { data, error } = await supabase
        .from('memories')
        .select('id, user_id, text, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map((d: any) => ({
          id: d.id,
          text: d.text,
          createdAt: d.created_at,
        }));

        // Mirror directly into local IndexedDB
        try {
          const db = await openLyraDB();
          const tx = db.transaction('memories', 'readwrite');
          const store = tx.objectStore('memories');
          await new Promise<void>((res, rej) => {
            const clearReq = store.clear();
            clearReq.onsuccess = () => res();
            clearReq.onerror = () => rej(clearReq.error);
          });
          for (const m of mapped) {
            store.put(withMeta(m), m.id);
          }
        } catch (mErr) {
          console.warn('[storage] Local memories cache update warning:', mErr);
        }

        return mapped;
      }
    }
  } catch (err) {
    console.warn('[storage] Remote memories fetch failed, using local:', err);
  }

  return getLocalMemories();
}

export async function saveMemory(textOrObj: any) {
  const text = typeof textOrObj === 'string' ? textOrObj : (textOrObj.text || textOrObj.content || textOrObj.factSummary || '');
  if (!text || !text.trim()) return;
  const cleanText = text.trim();

  let memoryId = (textOrObj && typeof textOrObj === 'object' && textOrObj.id) ? textOrObj.id : crypto.randomUUID();
  let createdAt = (textOrObj && typeof textOrObj === 'object' && textOrObj.createdAt) ? textOrObj.createdAt : new Date().toISOString();

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const payload: Record<string, any> = {
        user_id: session.user.id,
        text: cleanText,
      };
      if (typeof memoryId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memoryId)) {
        payload.id = memoryId;
      }

      const { data: inserted, error } = await supabase
        .from('memories')
        .insert(payload)
        .select()
        .single();

      if (!error && inserted) {
        memoryId = inserted.id;
        createdAt = inserted.created_at;
      } else if (error) {
        console.warn('[storage] Supabase memory insert error:', error);
      }
    }
  } catch (err) {
    console.warn('[storage] Remote memory save failed, using local:', err);
  }

  // Always keep local IndexedDB in sync
  return saveLocalMemory({
    id: memoryId,
    text: cleanText,
    createdAt,
  });
}

export async function deleteMemory(id: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const { error } = await supabase
        .from('memories')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);

      if (error) {
        console.warn('[storage] Supabase memory delete error:', error);
      }
    }
  } catch (err) {
    console.warn('[storage] Remote memory delete failed, using local:', err);
  }

  return deleteLocalMemory(id);
}

export async function resetChatAndMemory() {
  await clearAllMessages(); // always local, chat history never lives in Supabase

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { error } = await supabase
        .from('memories')
        .delete()
        .eq('user_id', session.user.id);
      if (error) {
        console.warn('[storage] Supabase memories reset error:', error);
      }
    }
  } catch (err) {
    console.warn('[storage] Remote reset failed, clearing local:', err);
  }

  await clearLocalMemories();
}

export async function wipeAllData() {
  await clearAllMessages();

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // 1. Delete all user memories
      await supabase.from('memories').delete().eq('user_id', session.user.id);

      // 2. Reset profiles table in Supabase
      await supabase.from('profiles').update({
        preferred_name: null,
        conversational_vibe: null,
        topics: [],
        active_outfit: 'lyra',
        voice_preset_id: 'soft-calm',
        onboarding_completed: false,
        updated_at: new Date().toISOString(),
      }).eq('id', session.user.id);
    }
  } catch (err) {
    console.warn('[storage] Remote wipe failed, clearing local:', err);
  }

  await clearLocalMemories();
  await clearLocalProfile();
}

export async function clearAllData(): Promise<void> {
  await clearAllMessages();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('memories').delete().eq('user_id', session.user.id);
    }
  } catch {}
  await clearLocalMemories();
  await clearLocalProfile();
}

export async function resetCompanionHistory(): Promise<void> {
  await clearAllMessages();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('memories').delete().eq('user_id', session.user.id);
    }
  } catch {}
  await clearLocalMemories();
}

export async function exportAllData(): Promise<string> {
  const profile = await getProfile();
  const companion = await getCompanion();
  const messages = await getMessages();
  const memories = await getMemories();
  const notificationPreferences = await getNotificationPreferences();
  const localProfile = await getLocalProfile();

  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    profile,
    companion,
    messages,
    memories,
    notificationPreferences,
    localProfile,
  };

  return JSON.stringify(payload, null, 2);
}

export async function importAllData(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString);
  if (!data || typeof data !== 'object' || !data.version) {
    throw new Error('Invalid backup file format');
  }

  await clearAllData();

  if (data.profile) await saveProfile(data.profile);
  if (data.companion) await saveCompanion(data.companion);
  if (Array.isArray(data.messages)) {
    for (const msg of data.messages) {
      await saveMessage(msg);
    }
  }
  if (Array.isArray(data.memories)) {
    for (const mem of data.memories) {
      await saveMemory(mem);
    }
  }
  if (data.notificationPreferences) await saveNotificationPreferences(data.notificationPreferences);
  if (data.localProfile) await saveLocalProfile(data.localProfile);
}

export const storage = {
  // Layer 1: Profile
  getProfile,
  saveProfile,
  isOnboardingCompleted,

  // Layer 2: Memories
  getMemories,
  saveMemory,
  deleteMemory,
  validateMemory,
  sanitizeMemoryText,

  // Layer 3: Recent Context
  getRecentMessages,

  // Supporting storage methods
  saveMessage,
  getMessages,
  getCompanion,
  saveCompanion,
  getNotificationPreferences,
  saveNotificationPreferences,
  getLocalProfile,
  saveLocalProfile,
  clearAllMessages,
  clearLocalMemories,
  clearLocalProfile,
  resetChatAndMemory,
  wipeAllData,
  clearAllData,
  resetCompanionHistory,
  exportAllData,
  importAllData,
};
