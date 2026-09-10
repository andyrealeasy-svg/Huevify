/**
 * Robust hybrid StorageService using IndexedDB + In-Memory Cache + LocalStorage fallback.
 * Solves the browser 5MB localStorage QuotaExceededError for media, base64 audio,
 * release requests, daily charts, and playback history.
 */

const DB_NAME = 'HuevifyStorageDB';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

// In-memory cache for synchronous reads
const memoryCache = new Map<string, any>();

// Helper to open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

// Low-level IndexedDB methods
async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    return undefined;
  }
}

async function idbSet(key: string, value: any): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('[StorageService] IndexedDB put failed', e);
  }
}

async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('[StorageService] IndexedDB delete failed', e);
  }
}

async function idbGetAllKeysAndValues(): Promise<Array<{ key: string; value: any }>> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const results: Array<{ key: string; value: any }> = [];

      const cursorRequest = store.openCursor();
      cursorRequest.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          results.push({ key: String(cursor.key), value: cursor.value });
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      cursorRequest.onerror = () => reject(cursorRequest.error);
    });
  } catch (e) {
    return [];
  }
}

// Clean up oversized keys from localStorage to prevent QuotaExceededError
function pruneLocalStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;

      // Specifically clear keys known to blow up localStorage quota
      if (
        k === 'huevify_release_requests' ||
        k === 'huevify_daily_chart' ||
        k.startsWith('huevify_recent_') ||
        k === 'huevify_chart_snapshot'
      ) {
        try {
          const raw = localStorage.getItem(k);
          if (raw && raw.length > 20000) {
            keysToRemove.push(k);
          }
        } catch (_) {}
      }
    }

    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (_) {}
    });
  } catch (_) {}
}

// Test artifact detection helpers
const TEST_ARTIST_NAMES_LOWER = new Set([
  'the algorithms',
  'binary beats',
  'null pointer',
  'stack overflow'
]);

const TEST_ARTIST_USERNAMES_LOWER = new Set([
  'thealgorithms',
  'binarybeats',
  'nullpointer',
  'stackoverflow'
]);

export function isTestTrack(t: any): boolean {
  if (!t) return false;
  if (typeof t.id === 'string' && /^t\d+$/i.test(t.id)) return true;
  if (typeof t.title === 'string' && /track number(\s*\d+)?/i.test(t.title)) return true;
  if (typeof t.artist === 'string' && TEST_ARTIST_NAMES_LOWER.has(t.artist.trim().toLowerCase())) return true;
  return false;
}

export function isTestAlbum(a: any): boolean {
  if (!a) return false;
  if (typeof a.id === 'string' && /^a\d+$/i.test(a.id)) return true;
  if (typeof a.title === 'string' && /^album\s*\d+$/i.test(a.title.trim())) return true;
  const artist = a.artist || a.artistName;
  if (typeof artist === 'string' && TEST_ARTIST_NAMES_LOWER.has(artist.trim().toLowerCase())) return true;
  if (Array.isArray(a.tracks) && a.tracks.some((tr: any) => isTestTrack(tr))) return true;
  return false;
}

export function isTestArtist(acc: any): boolean {
  if (!acc) return false;
  if (typeof acc.artistName === 'string' && TEST_ARTIST_NAMES_LOWER.has(acc.artistName.trim().toLowerCase())) return true;
  if (typeof acc.username === 'string' && TEST_ARTIST_USERNAMES_LOWER.has(acc.username.trim().toLowerCase())) return true;
  if (typeof acc.id === 'string' && /^art_(algorithms|binary|null|stack)/i.test(acc.id)) return true;
  return false;
}

export function purgeTestArtifacts(): void {
  try {
    // 1. Release Requests
    if (memoryCache.has('huevify_release_requests')) {
      const list = memoryCache.get('huevify_release_requests');
      if (Array.isArray(list)) {
        const filtered = list.filter((r) => !isTestAlbum(r));
        memoryCache.set('huevify_release_requests', filtered);
        idbSet('huevify_release_requests', filtered).catch(() => {});
        try { localStorage.setItem('huevify_release_requests', JSON.stringify(filtered)); } catch(_) {}
      }
    }

    // 2. Artist Accounts
    if (memoryCache.has('huevify_artist_accounts')) {
      const accounts = memoryCache.get('huevify_artist_accounts');
      if (Array.isArray(accounts)) {
        const filtered = accounts.filter((a) => !isTestArtist(a));
        memoryCache.set('huevify_artist_accounts', filtered);
        idbSet('huevify_artist_accounts', filtered).catch(() => {});
        try { localStorage.setItem('huevify_artist_accounts', JSON.stringify(filtered)); } catch(_) {}
      }
    }

    // 3. Profile Requests
    if (memoryCache.has('huevify_profile_requests')) {
      const reqs = memoryCache.get('huevify_profile_requests');
      if (Array.isArray(reqs)) {
        const filtered = reqs.filter((pr) => {
          if (typeof pr.artistName === 'string' && TEST_ARTIST_NAMES_LOWER.has(pr.artistName.trim().toLowerCase())) return false;
          return true;
        });
        memoryCache.set('huevify_profile_requests', filtered);
        idbSet('huevify_profile_requests', filtered).catch(() => {});
        try { localStorage.setItem('huevify_profile_requests', JSON.stringify(filtered)); } catch(_) {}
      }
    }

    // 4. Current Artist Session
    if (memoryCache.has('huevify_current_artist')) {
      const cur = memoryCache.get('huevify_current_artist');
      if (isTestArtist(cur)) {
        memoryCache.set('huevify_current_artist', null);
        idbDelete('huevify_current_artist').catch(() => {});
        try { localStorage.removeItem('huevify_current_artist'); } catch(_) {}
      }
    }

    // 5. Daily Chart
    if (memoryCache.has('huevify_daily_chart')) {
      const chart = memoryCache.get('huevify_daily_chart');
      if (Array.isArray(chart)) {
        const filtered = chart.filter((tr) => !isTestTrack(tr));
        memoryCache.set('huevify_daily_chart', filtered);
        idbSet('huevify_daily_chart', filtered).catch(() => {});
        try { localStorage.setItem('huevify_daily_chart', JSON.stringify(filtered)); } catch(_) {}
      }
    }

    // 6. Chart Snapshot
    if (memoryCache.has('huevify_chart_snapshot')) {
      const snap = memoryCache.get('huevify_chart_snapshot');
      if (snap && typeof snap === 'object') {
        const cleaned: Record<string, number> = {};
        for (const [k, v] of Object.entries(snap)) {
          if (!/^t\d+$/i.test(k)) {
            cleaned[k] = v as number;
          }
        }
        memoryCache.set('huevify_chart_snapshot', cleaned);
        idbSet('huevify_chart_snapshot', cleaned).catch(() => {});
        try { localStorage.setItem('huevify_chart_snapshot', JSON.stringify(cleaned)); } catch(_) {}
      }
    }

    // 7. Plays
    if (memoryCache.has('huevify_plays')) {
      const plays = memoryCache.get('huevify_plays');
      if (plays && typeof plays === 'object') {
        const cleaned: Record<string, number> = {};
        for (const [k, v] of Object.entries(plays)) {
          if (!/^t\d+$/i.test(k)) {
            cleaned[k] = v as number;
          }
        }
        memoryCache.set('huevify_plays', cleaned);
        idbSet('huevify_plays', cleaned).catch(() => {});
        try { localStorage.setItem('huevify_plays', JSON.stringify(cleaned)); } catch(_) {}
      }
    }

    // 8. Playlists
    if (memoryCache.has('huevify_playlists')) {
      const playlists = memoryCache.get('huevify_playlists');
      if (Array.isArray(playlists)) {
        const cleaned = playlists.map((pl) => ({
          ...pl,
          tracks: Array.isArray(pl.tracks) ? pl.tracks.filter((tid: string) => !/^t\d+$/i.test(tid)) : []
        }));
        memoryCache.set('huevify_playlists', cleaned);
        idbSet('huevify_playlists', cleaned).catch(() => {});
        try { localStorage.setItem('huevify_playlists', JSON.stringify(cleaned)); } catch(_) {}
      }
    }

    // 9. Legacy tracking keys
    ['huevify_deleted_legacy', 'huevify_deleted_legacy_tracks'].forEach((k) => {
      memoryCache.set(k, []);
      idbDelete(k).catch(() => {});
      try { localStorage.removeItem(k); } catch(_) {}
    });

    // 10. User-specific keys
    for (const [key, value] of memoryCache.entries()) {
      if (key.startsWith('huevify_recent_') && Array.isArray(value)) {
        const filtered = value.filter((tr) => !isTestTrack(tr));
        memoryCache.set(key, filtered);
        idbSet(key, filtered).catch(() => {});
        try { localStorage.setItem(key, JSON.stringify(filtered)); } catch(_) {}
      } else if (key.startsWith('huevify_liked_albums_') && Array.isArray(value)) {
        const filtered = value.filter((aid) => typeof aid === 'string' && !/^a\d+$/i.test(aid));
        memoryCache.set(key, filtered);
        idbSet(key, filtered).catch(() => {});
        try { localStorage.setItem(key, JSON.stringify(filtered)); } catch(_) {}
      } else if (key.startsWith('huevify_followed_artists_') && Array.isArray(value)) {
        const filtered = value.filter((name) => typeof name === 'string' && !TEST_ARTIST_NAMES_LOWER.has(name.trim().toLowerCase()));
        memoryCache.set(key, filtered);
        idbSet(key, filtered).catch(() => {});
        try { localStorage.setItem(key, JSON.stringify(filtered)); } catch(_) {}
      }
    }
  } catch (e) {
    console.warn('[StorageService] purgeTestArtifacts error:', e);
  }
}

// Pre-hydrate in-memory cache from localStorage on script evaluation
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('huevify_')) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            memoryCache.set(key, JSON.parse(item));
          }
        } catch (_) {}
      }
    }
    purgeTestArtifacts();
  } catch (_) {}
}

let isInitialized = false;
const CURRENT_CACHE_VERSION = 'v3_clear_cache_supabase';

let initPromise: Promise<void> | null = null;

export const StorageService = {
  /**
   * Initializes the storage service by syncing IndexedDB into in-memory cache
   * and migrating any large localStorage items safely to IndexedDB.
   */
  init: async (): Promise<void> => {
    if (isInitialized) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      try {
        // Automatic one-time cache purge if version changed
        if (typeof window !== 'undefined' && window.localStorage) {
          const cachedVer = localStorage.getItem('huevify_cache_ver');
          if (cachedVer !== CURRENT_CACHE_VERSION) {
            console.log('[StorageService] Purging legacy localStorage & IndexedDB cache for fresh Supabase sync...');
            await StorageService.clearAllCache(true);
            try {
              localStorage.setItem('huevify_cache_ver', CURRENT_CACHE_VERSION);
            } catch (_) {}
          }
        }

        // 1. Read all records from IndexedDB
        const records = await idbGetAllKeysAndValues();
        records.forEach(({ key, value }) => {
          memoryCache.set(key, value);
        });

        // 2. Migrate any existing localStorage records that might not be in IndexedDB
        if (typeof window !== 'undefined' && window.localStorage) {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('huevify_')) {
              try {
                const raw = localStorage.getItem(key);
                if (raw) {
                  const parsed = JSON.parse(raw);
                  if (!memoryCache.has(key)) {
                    memoryCache.set(key, parsed);
                    await idbSet(key, parsed);
                  }
                }
              } catch (_) {}
            }
          }

          // 3. Prune bloated items from localStorage to ensure plenty of free quota
          pruneLocalStorage();
        }

        // 4. Purge all test tracks, test releases, test artists and related artifacts
        purgeTestArtifacts();

        isInitialized = true;
      } catch (err) {
        console.warn('[StorageService] Init encountered an error:', err);
      }
    })();

    return initPromise;
  },
  purgeTestArtifacts,

  /**
   * Synchronous load. Checks memory cache first, then localStorage, then defaultVal.
   */
  load: <T>(key: string, defaultVal: T): T => {
    if (memoryCache.has(key)) {
      return memoryCache.get(key) as T;
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          memoryCache.set(key, parsed);
          return parsed as T;
        }
      } catch (_) {}
    }

    return defaultVal;
  },

  /**
   * Synchronous-facing save. Updates memory cache instantly, persists to IndexedDB
   * in the background, and safely saves to localStorage if space allows.
   */
  save: (key: string, value: any): void => {
    // 1. Update in-memory cache immediately
    memoryCache.set(key, value);

    // 2. Persist to IndexedDB asynchronously (handles virtually unlimited size)
    idbSet(key, value).catch((err) => {
      console.warn(`[StorageService] IndexedDB save error for ${key}:`, err);
    });

    // 3. Attempt to save to localStorage safely
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const serialized = JSON.stringify(value);

        // If payload is large (> 50 KB), do not cram into localStorage to prevent quota errors.
        // It is safely stored in IndexedDB and memoryCache.
        if (serialized.length > 50 * 1024) {
          try {
            // Remove full key from localStorage if it previously existed there
            localStorage.removeItem(key);
            localStorage.setItem(key + '_stored_in_idb', 'true');
          } catch (_) {}
          return;
        }

        localStorage.setItem(key, serialized);
      } catch (e: any) {
        // Quota exceeded in localStorage.
        // Free up space by removing bloated items from localStorage
        pruneLocalStorage();
      }
    }
  },

  /**
   * Removes an item from all storage layers.
   */
  remove: (key: string): void => {
    memoryCache.delete(key);
    idbDelete(key).catch(() => {});
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(key);
        localStorage.removeItem(key + '_stored_in_idb');
      } catch (_) {}
    }
  },

  /**
   * Completely purges all cached application data from LocalStorage, IndexedDB, and MemoryCache.
   * Cleans legacy releases, playlists, accounts, tracks, and charts, ensuring clean Supabase sync.
   */
  clearAllCache: async (keepAuth = false): Promise<void> => {
    // 1. Clear memory cache
    if (!keepAuth) {
      memoryCache.clear();
    } else {
      const savedUser = memoryCache.get('huevify_current_user');
      const savedArtist = memoryCache.get('huevify_current_artist');
      memoryCache.clear();
      if (savedUser) memoryCache.set('huevify_current_user', savedUser);
      if (savedArtist) memoryCache.set('huevify_current_artist', savedArtist);
    }

    // 2. Clear LocalStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const toDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('huevify_') || key.includes('stored_in_idb'))) {
            if (keepAuth && (key === 'huevify_current_user' || key === 'huevify_current_artist')) {
              continue;
            }
            toDelete.push(key);
          }
        }
        toDelete.forEach((k) => {
          try { localStorage.removeItem(k); } catch (_) {}
        });
      } catch (e) {
        console.warn('[StorageService] Error clearing localStorage:', e);
      }
    }

    // 3. Clear IndexedDB
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      await new Promise<void>((resolve, reject) => {
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('[StorageService] Error clearing IndexedDB:', e);
    }
  }
};

// Global helper for DevTools or console
if (typeof window !== 'undefined') {
  (window as any).clearHuevifyCache = async (keepAuth = false) => {
    await StorageService.clearAllCache(keepAuth);
    console.log('Huevify cache cleared successfully! Reloading...');
    window.location.reload();
  };
}
