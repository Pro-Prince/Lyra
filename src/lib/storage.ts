/**
 * StorageAdapter interface, implement this exactly for any future backend swap:
 * getCompanion(): Promise<Companion|null>
 * saveCompanion(data): Promise<void>
 * saveMessage(msg): Promise<void>
 * getMessages(limit?): Promise<Message[]>
 * saveMemory(mem): Promise<void>
 * getMemories(): Promise<Memory[]>
 * deleteMemory(id): Promise<void>
 * getRapport(): Promise<Rapport|null>
 * saveRapport(data): Promise<void>
 * getNotificationPreferences(): Promise<NotifPrefs|null>
 * saveNotificationPreferences(data): Promise<void>
 * getLocalProfile(): Promise<LocalProfile|null>
 * saveLocalProfile(data): Promise<void>
 */

const DB_NAME = 'lyra-db';
const DB_VERSION = 1;

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
      if (!db.objectStoreNames.contains('companion')) {
        db.createObjectStore('companion');
      }
      if (!db.objectStoreNames.contains('messages')) {
        db.createObjectStore('messages', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('memories')) {
        db.createObjectStore('memories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('rapport')) {
        db.createObjectStore('rapport');
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

export async function getCompanion(): Promise<any> {
  const db = await openLyraDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('companion', 'readonly');
    const store = tx.objectStore('companion');
    const req = store.get('current');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCompanion(data: any): Promise<void> {
  const db = await openLyraDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('companion', 'readwrite');
    const store = tx.objectStore('companion');
    const payload = withMeta(data);
    const req = store.put(payload, 'current');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function saveMessage(msg: any): Promise<void> {
  const db = await openLyraDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    const payload = withMeta({
      timestamp: msg.timestamp || Date.now(),
      ...msg
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

export async function saveMemory(mem: any): Promise<void> {
  const db = await openLyraDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('memories', 'readwrite');
    const store = tx.objectStore('memories');
    const payload = withMeta({
      createdAt: mem.createdAt || new Date().toISOString(),
      ...mem
    });
    const req = store.put(payload);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getMemories(): Promise<any[]> {
  const db = await openLyraDB();
  return new Promise<any[]>((resolve, reject) => {
    const tx = db.transaction('memories', 'readonly');
    const store = tx.objectStore('memories');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteMemory(id: string): Promise<void> {
  const db = await openLyraDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('memories', 'readwrite');
    const store = tx.objectStore('memories');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getRapport(): Promise<any> {
  const db = await openLyraDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('rapport', 'readonly');
    const store = tx.objectStore('rapport');
    const req = store.get('current');
    req.onsuccess = () => resolve(req.result || { tier: 'Tier 1', points: 0, lastUpdated: new Date().toISOString() });
    req.onerror = () => reject(req.error);
  });
}

export async function saveRapport(data: any): Promise<void> {
  const db = await openLyraDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('rapport', 'readwrite');
    const store = tx.objectStore('rapport');
    const payload = withMeta(data);
    const req = store.put(payload, 'current');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
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

export async function migrateIndexedDBToSupabase(_userId?: string) {}

export async function clearAllData(): Promise<void> {
  const db = await openLyraDB();
  const stores = ['companion', 'messages', 'memories', 'rapport', 'notificationPreferences', 'localProfile'];
  for (const storeName of stores) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export async function resetCompanionHistory(): Promise<void> {
  const db = await openLyraDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('memories', 'readwrite');
    const store = tx.objectStore('memories');
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function exportAllData(): Promise<string> {
  const companion = await getCompanion();
  const messages = await getMessages();
  const memories = await getMemories();
  const rapport = await getRapport();
  const notificationPreferences = await getNotificationPreferences();
  const localProfile = await getLocalProfile();

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    companion,
    messages,
    memories,
    rapport,
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
  if (data.rapport) await saveRapport(data.rapport);
  if (data.notificationPreferences) await saveNotificationPreferences(data.notificationPreferences);
  if (data.localProfile) await saveLocalProfile(data.localProfile);
}

export const storage = {
  getCompanion,
  saveCompanion,
  saveMessage,
  getMessages,
  saveMemory,
  getMemories,
  deleteMemory,
  getRapport,
  saveRapport,
  getNotificationPreferences,
  saveNotificationPreferences,
  getLocalProfile,
  saveLocalProfile,
};
