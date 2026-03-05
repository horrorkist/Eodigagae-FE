const LOCAL_STORAGE_KEYS = [
  "search:recent-keywords",
  "walkDebug",
  "walkDebugPanelVisible",
] as const;

const SESSION_STORAGE_KEYS = ["search:page-state"] as const;

type RemovalStat = {
  removed: number;
  failed: number;
};

export type ClearAppCacheResult = {
  localStorage: RemovalStat;
  sessionStorage: RemovalStat;
};

function removeKeys(
  storage: Storage,
  keys: readonly string[],
): RemovalStat {
  return keys.reduce<RemovalStat>(
    (acc, key) => {
      try {
        storage.removeItem(key);
        return {
          ...acc,
          removed: acc.removed + 1,
        };
      } catch {
        return {
          ...acc,
          failed: acc.failed + 1,
        };
      }
    },
    { removed: 0, failed: 0 },
  );
}

export function clearAppCache(): ClearAppCacheResult {
  if (typeof window === "undefined") {
    return {
      localStorage: { removed: 0, failed: 0 },
      sessionStorage: { removed: 0, failed: 0 },
    };
  }

  return {
    localStorage: removeKeys(window.localStorage, LOCAL_STORAGE_KEYS),
    sessionStorage: removeKeys(window.sessionStorage, SESSION_STORAGE_KEYS),
  };
}

export const APP_CACHE_KEYS = {
  localStorage: LOCAL_STORAGE_KEYS,
  sessionStorage: SESSION_STORAGE_KEYS,
} as const;
