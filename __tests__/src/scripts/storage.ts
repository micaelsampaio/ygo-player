import { getStorageKey } from "./constants";

export class LocalStorage {
  static getKeysFromPrefix(key: string, args?: { removePrefix?: boolean }) {
    const context = getStorageKey(key);
    const keys: string[] = [];

    for (const keyInStorage in window.localStorage) {
      if (keyInStorage.startsWith(context)) {
        keys.push(keyInStorage);
      }
    }

    if (args?.removePrefix) {
      keys.forEach(key => key.replace(context, ""));
    }

    return keys;
  }

  static get<T>(key: string): T {
    const context = getStorageKey(key);
    const value = window.localStorage.getItem(context);

    if (value) {
      try {
        return JSON.parse(value) as T;
      } catch (error) {
        return value as T;
      }
    }
    return undefined as T;
  }

  static set(key: string, value: any): void {
    const context = getStorageKey(key);

    if (typeof value === "object") {
      try {
        const valueToStore = JSON.stringify(value);
        window.localStorage.setItem(context, valueToStore);
      } catch {
      }
    } else {
      window.localStorage.setItem(context, value);
    }
  }

  static remove(key: string): void {
    const context = getStorageKey(key);
    window.localStorage.removeItem(context);
  }

}