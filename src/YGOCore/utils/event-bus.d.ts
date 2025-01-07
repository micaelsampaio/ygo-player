export declare class EventBus<T extends Record<string, (...args: any[]) => void>> {
    private events;
    constructor();
    on<K extends keyof T>(event: K, listener: T[K]): void;
    dispatch<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void;
    off<K extends keyof T>(event: K, listener: T[K]): void;
    clear<K extends keyof T>(event: K): void;
    clearAll(): void;
}
