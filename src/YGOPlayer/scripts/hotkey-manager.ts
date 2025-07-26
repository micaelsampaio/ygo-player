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
        const active = document.activeElement;
        const enteringText = active instanceof HTMLElement
          && (active.isContentEditable
            || active.tagName === 'INPUT'
            || active.tagName === 'TEXTAREA');
        if (enteringText) return;

        this.dispatch(shortcut.action);
      };
    }

    this.unsubscribeTinyKeysEvents = tinykeys(window, bindings);
  }

  on(eventName: string, cb: () => void): () => void {
    this.events.set(eventName, [...this.events.get(eventName) || [], cb]);

    return () => {
      this.off(eventName, cb);
    }
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
    // only calls the last bind of that shortcut 
    // so you cant have 2 shortcuts with the same keybinds at the same time
    if (!this.enabled) return;

    const events = this.events.get(eventName);
    if (!events || events.length === 0) return;

    const lastEvent = events[events.length - 1];
    lastEvent?.();
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
