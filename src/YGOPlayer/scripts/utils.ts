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