/**
 * localStorage that never throws. Storage can be missing (no window, SSR,
 * tests) or throw on access (private mode, blocked site data); every helper
 * then falls back instead: the value just isn't remembered.
 */
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** The browser's localStorage, or undefined when it is missing or blocked. */
export function getStorage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/** The stored value, or null when it is missing or storage is unavailable. */
export function safeGetItem(key: string, storage: Pick<Storage, "getItem"> | undefined = getStorage()): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Stores the value; returns false when storage is unavailable. */
export function safeSetItem(key: string, value: string, storage: Pick<Storage, "setItem"> | undefined = getStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Removes the value; returns false when storage is unavailable. */
export function safeRemoveItem(key: string, storage: Pick<Storage, "removeItem"> | undefined = getStorage()): boolean {
  try {
    if (!storage) return false;
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
