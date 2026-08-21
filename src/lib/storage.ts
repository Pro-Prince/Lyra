import { openDB, DBSchema, IDBPDatabase } from 'idb';

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
}

const DB_NAME = 'lyra-pwa-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<LyraDB>>;

if (typeof window !== 'undefined') {
  dbPromise = openDB<LyraDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('companion');
      db.createObjectStore('messages', { keyPath: 'id' });
      db.createObjectStore('memories', { keyPath: 'id' });
      db.createObjectStore('rapport');
      db.createObjectStore('localProfile');
    },
  });
}

export async function getCompanion() {
  const db = await dbPromise;
  return db.get('companion', 'current');
}

export async function saveCompanion(data: any) {
  const db = await dbPromise;
  await db.put('companion', data, 'current');
}

export async function getMessages() {
  const db = await dbPromise;
  return db.getAll('messages');
}

export async function saveMessage(msg: any) {
  const db = await dbPromise;
  await db.put('messages', msg);
}

export async function getMemories() {
  const db = await dbPromise;
  return db.getAll('memories');
}

export async function saveMemory(mem: any) {
  const db = await dbPromise;
  await db.put('memories', mem);
}

export async function deleteMemory(id: string) {
  const db = await dbPromise;
  await db.delete('memories', id);
}

export async function getRapport() {
  const db = await dbPromise;
  return db.get('rapport', 'current');
}

export async function saveRapport(data: any) {
  const db = await dbPromise;
  await db.put('rapport', data, 'current');
}

export async function getLocalProfile() {
  const db = await dbPromise;
  return db.get('localProfile', 'current');
}

export async function saveLocalProfile(data: any) {
  const db = await dbPromise;
  await db.put('localProfile', data, 'current');
}

export async function clearAllData() {
  const db = await dbPromise;
  await db.clear('companion');
  await db.clear('messages');
  await db.clear('memories');
  await db.clear('rapport');
  await db.clear('localProfile');
}
