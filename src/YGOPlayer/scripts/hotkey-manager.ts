import { tinykeys } from "tinykeys";

type Shortcut = {
  keys: string;
  action: string;
};

export class HotKeyManager {
  private events: Map<string, (() => void)[]> = new Map();
  private enabled: boolean = true;
  private unsubscribeTinyKeysEvents?: () => void;

  constructor(shortcuts: Shortcut[] = []) {
    this.createShortcutsEvents(shortcuts);
  }

  createShortcutsEvents(shortcuts: Shortcut[]) {
    this.clear();

    const bindings: Record<string, () => void> = {};

    for (const shortcut of shortcuts) {
      bindings[shortcut.keys] = () => {
        this.dispatch(shortcut.action);
      };
    }

    this.unsubscribeTinyKeysEvents = tinykeys(window, bindings);
  }

  on(eventName: string, cb: () => void) {
    this.events.set(eventName, [...this.events.get(eventName) || [], cb]);
  }

  off(eventName: string, cb: () => void) {
    const events = this.events.get(eventName);
    if (events) {
      const newEvents = events.filter(c => c !== cb);
      if (newEvents.length > 0) {
        this.events.set(eventName, newEvents);
      } else {
        this.events.delete(eventName);
      }
    }
  }

  dispatch(eventName: string) {
    if (!this.enabled) return;

    if (this.events.has(eventName)) {
      for (const cb of this.events.get(eventName)!) {
        try {
          cb();
        } catch {
          // Ignore callback errors
        }
      }
    }
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  clear() {
    this.unsubscribeTinyKeysEvents?.();
    this.unsubscribeTinyKeysEvents = undefined;
  }

  destroy() {
    this.clear();
    this.events.clear();
  }
}
