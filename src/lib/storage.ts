import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { supabase, isSupabaseConfigured } from './supabaseClient';

interface LyraDB extends DBSchema {
  companion: {
    key: string;
    value: any;
  };
  messages: {
    key: string;
    value: any;
  };
  memories: {
    key: string;
    value: any;
  };
  rapport: {
    key: string;
    value: any;
  };
  localProfile: {
    key: string;
    value: any;
  };
  notificationPreferences: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'lyra-pwa-db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<LyraDB>> | null = null;

function getIDB(): Promise<IDBPDatabase<LyraDB>> {
  if (!dbPromise && typeof window !== 'undefined') {
    dbPromise = openDB<LyraDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('companion');
          db.createObjectStore('messages', { keyPath: 'id' });
          db.createObjectStore('memories', { keyPath: 'id' });
          db.createObjectStore('rapport');
          db.createObjectStore('localProfile');
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('notificationPreferences')) {
            db.createObjectStore('notificationPreferences');
          }
        }
      },
    });
  }
  return dbPromise!;
}

// Helper to get active Supabase authenticated User ID safely
async function getAuthUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch (err) {
    return null;
  }
}

// ============================================================================
// COMPANION STORAGE
// ============================================================================

export async function getCompanion(): Promise<any> {
  const userId = await getAuthUserId();

  if (userId && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('companions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        const comp = {
          name: data.name || 'Lyra',
          userName: data.user_name || '',
          vibe: data.vibe || 'Warm & Gentle',
          interests: data.interests || [],
          voiceUri: data.voice_uri || '',
          pitch: data.pitch !== null ? Number(data.pitch) : 1.05,
          rate: data.rate !== null ? Number(data.rate) : 0.98,
          language: data.language || 'en-US',
          scenery: data.scenery || 'neutral',
          outfit: data.outfit || '/models/lyra.vrm',
          initialized: data.initialized ?? true,
          dailyCheckInEnabled: Boolean(data.daily_check_in_enabled),
          dailyCheckInTime: data.daily_check_in_time || '09:00',
        };
        // Update local IndexedDB cache
        const db = await getIDB();
        await db.put('companion', comp, 'current');
        return comp;
      }
    } catch (err) {
      console.warn('Error reading companion from Supabase, falling back to IndexedDB:', err);
    }
  }

  // Local fallback
  const db = await getIDB();
  return db.get('companion', 'current');
}

export async function saveCompanion(data: any): Promise<void> {
  // Always update local IndexedDB for immediate responsiveness
  const db = await getIDB();
  await db.put('companion', data, 'current');

  const userId = await getAuthUserId();
  if (userId && isSupabaseConfigured) {
    try {
      // NOTE: Strictly no age field on companions
      const payload = {
        user_id: userId,
        name: data.name || 'Lyra',
        user_name: data.userName || data.name || null,
        vibe: data.vibe || 'Warm & Gentle',
        interests: Array.isArray(data.interests) ? data.interests : [],
        voice_uri: data.voiceUri || null,
        pitch: data.pitch !== undefined ? Number(data.pitch) : 1.05,
        rate: data.rate !== undefined ? Number(data.rate) : 0.98,
        language: data.language || 'en-US',
        scenery: data.scenery || 'neutral',
        outfit: data.outfit || '/models/lyra.vrm',
        initialized: data.initialized ?? true,
        daily_check_in_enabled: Boolean(data.dailyCheckInEnabled),
        daily_check_in_time: data.dailyCheckInTime || '09:00',
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('companions')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) {
        console.warn('Supabase companion upsert error:', error.message);
      }
    } catch (err) {
      console.error('Failed to sync companion to Supabase:', err);
    }
  }
}

// ============================================================================
// MESSAGES STORAGE
// ============================================================================

export async function getMessages(): Promise<any[]> {
  const userId = await getAuthUserId();

  if (userId && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: true });

      if (!error && data) {
        const msgs = data.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: Number(m.timestamp),
          emotion: m.emotion,
        }));

        // Mirror to local IndexedDB
        const db = await getIDB();
        const tx = db.transaction('messages', 'readwrite');
        for (const msg of msgs) {
          await tx.store.put(msg);
        }
        await tx.done;

        return msgs;
      }
    } catch (err) {
      console.warn('Error reading messages from Supabase, falling back to IndexedDB:', err);
    }
  }

  // Local fallback
  const db = await getIDB();
  return db.getAll('messages');
}

export async function saveMessage(msg: any): Promise<void> {
  const normalizedMsg = {
    id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    role: msg.role || 'user',
    content: msg.content || '',
    timestamp: typeof msg.timestamp === 'number' ? msg.timestamp : Date.now(),
    emotion: msg.emotion || null,
  };

  // Local IndexedDB update
  const db = await getIDB();
  await db.put('messages', normalizedMsg);

  const userId = await getAuthUserId();
  if (userId && isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('messages')
        .upsert({
          id: normalizedMsg.id,
          user_id: userId,
          role: normalizedMsg.role,
          content: normalizedMsg.content,
          timestamp: normalizedMsg.timestamp,
          emotion: normalizedMsg.emotion,
        });

      if (error) {
        console.warn('Supabase message save error:', error.message);
      }
    } catch (err) {
      console.error('Failed to sync message to Supabase:', err);
    }
  }
}

// ============================================================================
// MEMORIES STORAGE
// ============================================================================

export async function getMemories(): Promise<any[]> {
  const userId = await getAuthUserId();

  if (userId && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (!error && data) {
        const mems = data.map(m => ({
          id: m.id,
          content: m.content,
          timestamp: Number(m.timestamp),
        }));

        // Mirror to local IndexedDB
        const db = await getIDB();
        const tx = db.transaction('memories', 'readwrite');
        for (const mem of mems) {
          await tx.store.put(mem);
        }
        await tx.done;

        return mems;
      }
    } catch (err) {
      console.warn('Error reading memories from Supabase, falling back to IndexedDB:', err);
    }
  }

  // Local fallback
  const db = await getIDB();
  return db.getAll('memories');
}

export async function saveMemory(mem: any): Promise<void> {
  const normalizedMem = {
    id: mem.id || `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    content: mem.content || '',
    timestamp: typeof mem.timestamp === 'number' ? mem.timestamp : Date.now(),
  };

  const db = await getIDB();
  await db.put('memories', normalizedMem);

  const userId = await getAuthUserId();
  if (userId && isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('memories')
        .upsert({
          id: normalizedMem.id,
          user_id: userId,
          content: normalizedMem.content,
          timestamp: normalizedMem.timestamp,
        });

      if (error) {
        console.warn('Supabase memory save error:', error.message);
      }
    } catch (err) {
      console.error('Failed to sync memory to Supabase:', err);
    }
  }
}

export async function deleteMemory(id: string): Promise<void> {
  const db = await getIDB();
  await db.delete('memories', id);

  const userId = await getAuthUserId();
  if (userId && isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('memories')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.warn('Supabase memory delete error:', error.message);
      }
    } catch (err) {
      console.error('Failed to delete memory from Supabase:', err);
    }
  }
}

// ============================================================================
// RAPPORT STORAGE
// ============================================================================

export async function getRapport(): Promise<any> {
  const userId = await getAuthUserId();

  if (userId && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('rapport')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        const rapportData = {
          score: data.score ?? 0,
          tier: data.tier || 'Tier 1: Acquaintance',
          progress: data.progress ?? 0,
          history: data.history || [],
        };

        const db = await getIDB();
        await db.put('rapport', rapportData, 'current');
        return rapportData;
      }
    } catch (err) {
      console.warn('Error reading rapport from Supabase:', err);
    }
  }

  // Local fallback
  const db = await getIDB();
  return db.get('rapport', 'current');
}

export async function saveRapport(data: any): Promise<void> {
  const db = await getIDB();
  await db.put('rapport', data, 'current');

  const userId = await getAuthUserId();
  if (userId && isSupabaseConfigured) {
    try {
      const payload = {
        user_id: userId,
        score: typeof data.score === 'number' ? data.score : 0,
        tier: data.tier || 'Tier 1: Acquaintance',
        progress: typeof data.progress === 'number' ? data.progress : 0,
        history: Array.isArray(data.history) ? data.history : [],
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('rapport')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) {
        console.warn('Supabase rapport upsert error:', error.message);
      }
    } catch (err) {
      console.error('Failed to sync rapport to Supabase:', err);
    }
  }
}

// ============================================================================
// NOTIFICATION PREFERENCES STORAGE
// ============================================================================

export async function getNotificationPreferences(): Promise<any> {
  const userId = await getAuthUserId();

  if (userId && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        const prefs = {
          enabled: data.enabled ?? false,
          morningCheckin: data.morning_checkin ?? true,
          eveningCheckin: data.evening_checkin ?? true,
          morningTime: data.morning_time || '09:00',
          eveningTime: data.evening_time || '21:00',
          fcmToken: data.fcm_token || null,
        };

        const db = await getIDB();
        await db.put('notificationPreferences', prefs, 'current');
        return prefs;
      }
    } catch (err) {
      console.warn('Error reading notification preferences from Supabase:', err);
    }
  }

  const db = await getIDB();
  return db.get('notificationPreferences', 'current');
}

export async function saveNotificationPreferences(data: any): Promise<void> {
  const db = await getIDB();
  await db.put('notificationPreferences', data, 'current');

  const userId = await getAuthUserId();
  if (userId && isSupabaseConfigured) {
    try {
      const payload = {
        user_id: userId,
        enabled: Boolean(data.enabled),
        morning_checkin: data.morningCheckin ?? true,
        evening_checkin: data.eveningCheckin ?? true,
        morning_time: data.morningTime || '09:00',
        evening_time: data.eveningTime || '21:00',
        fcm_token: data.fcmToken || null,
        updated_at: new Date().toISOString(),
      };

      await supabase
        .from('notification_preferences')
        .upsert(payload, { onConflict: 'user_id' });
    } catch (err) {
      console.error('Failed to sync notification preferences to Supabase:', err);
    }
  }
}

// ============================================================================
// LOCAL PROFILE & CLEARING
// ============================================================================

export async function getLocalProfile(): Promise<any> {
  const db = await getIDB();
  return db.get('localProfile', 'current');
}

export async function saveLocalProfile(data: any): Promise<void> {
  const db = await getIDB();
  await db.put('localProfile', data, 'current');
}

export async function resetCompanionHistory(): Promise<void> {
  const db = await getIDB();
  await db.clear('messages');
  await db.clear('memories');
  await db.clear('rapport');

  const userId = await getAuthUserId();
  if (userId && isSupabaseConfigured) {
    try {
      await supabase.from('messages').delete().eq('user_id', userId);
      await supabase.from('memories').delete().eq('user_id', userId);
      await supabase.from('rapport').delete().eq('user_id', userId);
    } catch (err) {
      console.warn('Failed to reset cloud companion history:', err);
    }
  }
}

export async function clearAllData(): Promise<void> {
  const db = await getIDB();
  await db.clear('companion');
  await db.clear('messages');
  await db.clear('memories');
  await db.clear('rapport');
  await db.clear('localProfile');
  await db.clear('notificationPreferences');

  const userId = await getAuthUserId();
  if (userId && isSupabaseConfigured) {
    try {
      await supabase.from('messages').delete().eq('user_id', userId);
      await supabase.from('memories').delete().eq('user_id', userId);
      await supabase.from('rapport').delete().eq('user_id', userId);
      await supabase.from('companions').delete().eq('user_id', userId);
      await supabase.from('notification_preferences').delete().eq('user_id', userId);
    } catch (err) {
      console.warn('Failed to clear cloud data:', err);
    }
  }
}

// ============================================================================
// ONE-TIME MIGRATION ROUTINE (IndexedDB -> Supabase)
// ============================================================================

export async function migrateIndexedDBToSupabase(userId: string): Promise<{ success: boolean; migratedItemsCount: number }> {
  if (!isSupabaseConfigured || !userId) {
    return { success: false, migratedItemsCount: 0 };
  }

  const migrationKey = `lyra_migrated_${userId}`;
  if (localStorage.getItem(migrationKey) === 'true') {
    return { success: true, migratedItemsCount: 0 };
  }

  console.log(`[Lyra Migration] Starting one-time IndexedDB to Supabase migration for user: ${userId}`);
  let count = 0;

  try {
    const db = await getIDB();

    // 1. Companion
    const localComp = await db.get('companion', 'current');
    if (localComp) {
      const companionPayload = {
        user_id: userId,
        name: localComp.name || 'Lyra',
        user_name: localComp.userName || localComp.name || null,
        vibe: localComp.vibe || 'Warm & Gentle',
        interests: Array.isArray(localComp.interests) ? localComp.interests : [],
        voice_uri: localComp.voiceUri || null,
        pitch: localComp.pitch !== undefined ? Number(localComp.pitch) : 1.05,
        rate: localComp.rate !== undefined ? Number(localComp.rate) : 0.98,
        language: localComp.language || 'en-US',
        scenery: localComp.scenery || 'neutral',
        outfit: localComp.outfit || '/models/lyra.vrm',
        initialized: localComp.initialized ?? true,
        daily_check_in_enabled: Boolean(localComp.dailyCheckInEnabled),
        daily_check_in_time: localComp.dailyCheckInTime || '09:00',
      };
      await supabase.from('companions').upsert(companionPayload, { onConflict: 'user_id' });
      count++;
    }

    // 2. Messages
    const localMsgs = await db.getAll('messages');
    if (localMsgs && localMsgs.length > 0) {
      const messagesPayload = localMsgs.map(m => ({
        id: m.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        user_id: userId,
        role: m.role || 'user',
        content: m.content || '',
        timestamp: typeof m.timestamp === 'number' ? m.timestamp : Date.now(),
        emotion: m.emotion || null,
      }));

      // Upsert in chunks of 50
      for (let i = 0; i < messagesPayload.length; i += 50) {
        const chunk = messagesPayload.slice(i, i + 50);
        await supabase.from('messages').upsert(chunk);
      }
      count += localMsgs.length;
    }

    // 3. Memories
    const localMems = await db.getAll('memories');
    if (localMems && localMems.length > 0) {
      const memoriesPayload = localMems.map(m => ({
        id: m.id || `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        user_id: userId,
        content: m.content || '',
        timestamp: typeof m.timestamp === 'number' ? m.timestamp : Date.now(),
      }));
      await supabase.from('memories').upsert(memoriesPayload);
      count += localMems.length;
    }

    // 4. Rapport
    const localRapport = await db.get('rapport', 'current');
    if (localRapport) {
      const rapportPayload = {
        user_id: userId,
        score: typeof localRapport.score === 'number' ? localRapport.score : 0,
        tier: localRapport.tier || 'Tier 1: Acquaintance',
        progress: typeof localRapport.progress === 'number' ? localRapport.progress : 0,
        history: Array.isArray(localRapport.history) ? localRapport.history : [],
      };
      await supabase.from('rapport').upsert(rapportPayload, { onConflict: 'user_id' });
      count++;
    }

    // Mark profile and local storage as migrated
    localStorage.setItem(migrationKey, 'true');
    await supabase.from('profiles').update({ migrated: true }).eq('id', userId);

    console.log(`[Lyra Migration] Successfully migrated ${count} records to Supabase.`);
    return { success: true, migratedItemsCount: count };
  } catch (err) {
    console.error('[Lyra Migration] Error during migration:', err);
    return { success: false, migratedItemsCount: count };
  }
}
