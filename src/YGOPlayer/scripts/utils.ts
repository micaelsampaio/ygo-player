import { getStorage } from "./safe-storage";

export function getJsonFromLocalStorage(key: string, defaultValue: unknown = {}): unknown {
    try {
        const storage = getStorage();
        if (!storage) return defaultValue;
        const json = JSON.parse(storage.getItem(key)!);
        return json;
    } catch {
        return defaultValue;
    }
}

export function safeStringify(value: unknown): string {
    try {
        return JSON.stringify(value);
    } catch {
        return "{}";
    }
}

/** Merges `source` into `target` in place (nested objects too) and returns `target`. */
export function deepMerge<T extends object>(target: object, source: unknown): T {
    const into = target as Record<string, unknown>;
    const from = source as Record<string, unknown>;
    for (const key in from) {
        if (Object.prototype.hasOwnProperty.call(from, key)) {
            const targetValue = into[key];
            const sourceValue = from[key];

            if (isObject(targetValue) && isObject(sourceValue)) {
                into[key] = deepMerge(targetValue, sourceValue);
            } else {
                into[key] = sourceValue;
            }
        }
    }
    return target as T;
}

export function isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object';
}

/**
 * Keeps a menu's mouse events off the 3D board. The default action is also cancelled, except
 * for text fields and submit buttons: cancelling a submit button's click cancels its form's
 * submit (the timer menu's countdown "Start" did nothing).
 */
export function stopPropagationCallback(e: Pick<Event, "target" | "preventDefault" | "stopPropagation">) {
    const target = e.target as Element | null;
    const isSubmit = typeof target?.closest === "function" && !!target.closest('button[type="submit"], input[type="submit"]');
    if (!(target instanceof HTMLInputElement) && !isSubmit) {
        e.preventDefault();
    }
    e.stopPropagation();
}

export function removeFocusFromActiveElement() {
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
}

export function chunkRandomly<T>(arr: T[], maxGroups: number): T[][] {
    if (arr.length === 0) return [];
    if (maxGroups <= 1) return [arr];

    const result: T[][] = [];
    let remaining = [...arr];
    let groupsLeft = maxGroups;

    while (remaining.length > 0 && groupsLeft > 0) {
        const maxPossibleSize = Math.ceil(remaining.length / groupsLeft);
        const size = Math.max(1, Math.floor(Math.random() * maxPossibleSize));

        result.push(remaining.slice(0, size));
        remaining = remaining.slice(size);
        groupsLeft--;
    }

    if (remaining.length > 0) result.push(remaining);

    return result;
}
