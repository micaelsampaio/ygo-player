import { tinykeys } from "tinykeys";

type Shortcut = {
  keys: string;
  action: string;
};

export class HotKeyManager {
  private events: Map<string, (() => void)[]> = new Map();
  /** Handlers that are always there (the default Escape, a field glow's): they don't claim their key. */
  private background = new Set<() => void>();
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

  /**
   * Adds a handler; the latest one registered for a key is the one that runs.
   * `background`: an ambient handler (the default Escape, a field glow's own)
   * that doesn't count for `claimed`.
   */
  on(eventName: string, cb: () => void, opts?: { background?: boolean }): () => void {
    this.events.set(eventName, [...this.events.get(eventName) || [], cb]);
    if (opts?.background) this.background.add(cb);

    return () => {
      this.off(eventName, cb);
    }
  }

  off(eventName: string, cb: () => void) {
    this.background.delete(cb);
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

  /** A popup / menu / drag owns the key right now: a non-background handler is registered for it. */
  claimed(eventName: string): boolean {
    return (this.events.get(eventName) ?? []).some((cb) => !this.background.has(cb));
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
    this.background.clear();
  }
}
