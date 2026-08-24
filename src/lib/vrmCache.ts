const MEMORY_CACHE = new Map<string, ArrayBuffer>();
const DB_NAME = 'LyraVRMCacheDB_v2';
const DB_VERSION = 1;
const STORE_NAME = 'models';

export function isValidGLTFBuffer(buf: ArrayBuffer | null | undefined): boolean {
  if (!buf || buf.byteLength < 1000) return false;
  try {
    const view = new DataView(buf);
    const magic = view.getUint32(0, true); // 'glTF' (0x46546c67)
    if (magic !== 0x46546c67) return false;

    const version = view.getUint32(4, true);
    if (version !== 2) return false;

    // Check if 'JSON' (0x4E4F534A) chunk type appears anywhere between offset 12 and 32
    let hasJSON = false;
    for (let i = 12; i <= Math.min(32, buf.byteLength - 4); i++) {
      const val = view.getUint32(i, true);
      if (val === 0x4E4F534A) {
        hasJSON = true;
        break;
      }
    }

    if (!hasJSON) {
      console.warn(`[vrmCache] GLB missing JSON chunk in header area`);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllModelBuffers(): Promise<void> {
  MEMORY_CACHE.clear();
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
  } catch (err) {
    console.warn('[vrmCache] IndexedDB clear error:', err);
  }
}

export async function clearCachedModelBuffer(url: string): Promise<void> {
  const cleanUrl = url.split('?')[0];
  MEMORY_CACHE.delete(cleanUrl);
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(cleanUrl);
  } catch (err) {
    console.warn('[vrmCache] IndexedDB delete error:', err);
  }
}

export async function getCachedModelBuffer(url: string): Promise<ArrayBuffer | null> {
  const cleanUrl = url.split('?')[0];

  // 1. Check memory cache first (0ms)
  if (MEMORY_CACHE.has(cleanUrl)) {
    const buf = MEMORY_CACHE.get(cleanUrl)!;
    if (isValidGLTFBuffer(buf)) {
      return buf.slice(0);
    } else {
      MEMORY_CACHE.delete(cleanUrl);
    }
  }

  // 2. Check IndexedDB (~5ms)
  try {
    const db = await openDB();
    const buffer = await new Promise<ArrayBuffer | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(cleanUrl);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (buffer && buffer instanceof ArrayBuffer && isValidGLTFBuffer(buffer)) {
      MEMORY_CACHE.set(cleanUrl, buffer);
      return buffer.slice(0);
    } else if (buffer) {
      console.warn(`[vrmCache] Found invalid cached buffer for ${cleanUrl}. Purging.`);
      await clearCachedModelBuffer(cleanUrl);
    }
  } catch (err) {
    console.warn('[vrmCache] IndexedDB read error:', err);
  }

  return null;
}

export async function setCachedModelBuffer(url: string, buffer: ArrayBuffer): Promise<void> {
  if (!isValidGLTFBuffer(buffer)) {
    console.warn(`[vrmCache] Refusing to cache invalid GLB buffer for ${url}`);
    return;
  }
  const cleanUrl = url.split('?')[0];
  const copy = buffer.slice(0);
  MEMORY_CACHE.set(cleanUrl, copy);

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(copy, cleanUrl);
  } catch (err) {
    console.warn('[vrmCache] IndexedDB write error:', err);
  }
}

export async function fetchAndCacheVRMModel(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
  // 1. Return cached valid buffer if available
  const cached = await getCachedModelBuffer(url);
  if (cached && isValidGLTFBuffer(cached)) {
    return cached;
  }

  // 2. Fetch binary file from server
  const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}v=v8_fetch`;
  console.log(`[vrmCache] Fetching binary model data from ${fetchUrl}...`);
  const res = await fetch(fetchUrl, { signal });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} (${res.statusText || 'Error'}) when fetching model at ${url}`);
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();

  // Diagnostic check for Content-Type
  if (!contentType.includes('model/vrm')) {
    console.warn(`[vrmCache] Diagnostic Details: Response Content-Type for ${url} is "${contentType}". Preferred MIME type is "model/vrm". Status: ${res.status}`);
  }

  if (contentType.includes('text/html') || contentType.includes('application/json') || contentType.includes('text/plain')) {
    console.error(`[vrmCache] Diagnostic Error: Endpoint for ${url} returned non-binary text content (Content-Type: "${contentType}"). Refusing to parse text as model JSON.`);
    throw new Error(`Server returned text/html/json instead of binary 3D model data for ${url}. Check server route or file path.`);
  }

  // Always extract binary ArrayBuffer (never text or JSON)
  const buffer = await res.arrayBuffer();

  // Validate binary glTF 2.0 structure before caching or returning
  if (!isValidGLTFBuffer(buffer)) {
    const textPreview = new TextDecoder().decode(buffer.slice(0, 100));
    console.error(`[vrmCache] Diagnostic Error: Binary validation failed for ${url} (${buffer.byteLength} bytes). Header preview: "${textPreview.replace(/\r?\n/g, ' ')}"`);
    throw new Error(`Fetched data for ${url} is not a valid binary glTF/VRM container.`);
  }

  // Save to memory and IndexedDB
  await setCachedModelBuffer(url, buffer);
  return buffer.slice(0);
}

export async function preloadVRMModel(url: string): Promise<void> {
  try {
    const cached = await getCachedModelBuffer(url);
    if (cached) return;

    const buf = await fetchAndCacheVRMModel(url);
    console.log(`[vrmCache] Preloaded & validated ${url} (${(buf.byteLength / 1024 / 1024).toFixed(1)}MB)`);
  } catch (err) {
    console.warn('[vrmCache] Preload warning for', url, err);
  }
}

export function preloadAllVRMModels(): void {
  if (typeof window === 'undefined') return;
  const models = [
    '/models/lyra.vrm?v=2',
    '/models/lyra_casual.vrm?v=2',
    '/models/lyra_dress.vrm?v=2'
  ];
  models.forEach((url, idx) => {
    setTimeout(() => {
      preloadVRMModel(url);
    }, idx * 200);
  });
}

