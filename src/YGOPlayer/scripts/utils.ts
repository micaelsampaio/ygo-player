export function getJsonFromLocalStorage(key: string, defaultValue: any = {}) {
    try {
        const json = JSON.parse(window.localStorage.getItem(key)!);
        return json;
    } catch (error) {
        return defaultValue;
    }
}

export function safeStringify(value: any): string {
    try {
        return JSON.stringify(value);
    } catch (error) {
        return "{}";
    }
}

export function deepMerge<T = any>(target: any, source: any): T {
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            const targetValue = target[key];
            const sourceValue = source[key];

            if (isObject(targetValue) && isObject(sourceValue)) {
                target[key] = deepMerge(targetValue, sourceValue);
            } else {
                target[key] = sourceValue;
            }
        }
    }
    return target as T;
}

export function isObject(value: any): value is { [key: string]: any } {
    return value !== null && typeof value === 'object';
}

export function stopPropagationCallback(e: any) {
    if (!(e.target instanceof HTMLInputElement)) {
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
