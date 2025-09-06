interface EventBusArguments {
    signal: AbortSignal
}

export class EventBus<T extends Record<keyof (T), (...args: any[]) => void>> {
    private events: Map<keyof T, Function[]>;

    constructor() {
        this.events = new Map();
    }

    on<K extends keyof T>(event: K, listener: T[K], args?: EventBusArguments): void {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(listener);

        if (args?.signal) {
            const abortHandler = () => {
                this.off(event, listener);
                args.signal?.removeEventListener('abort', abortHandler);
            };
            args.signal.addEventListener('abort', abortHandler);
        }
    }

    dispatch<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void {
        const listeners = this.events.get(event);
        if (listeners) {
            listeners.forEach(listener => {
                listener(...args)
            });
        }
    }

    off<K extends keyof T>(event: K, listener: T[K]): void {
        const listeners = this.events.get(event);
        if (listeners) {
            this.events.set(
                event,
                listeners.filter(l => l !== listener)
            );
        }
    }

    clear<K extends keyof T>(event: K): void {
        if (this.events.has(event)) {
            this.events.delete(event);
        }
    }

    clearAll(): void {
        this.events.clear();
    }
}