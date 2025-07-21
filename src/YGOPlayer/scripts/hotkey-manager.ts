type Shortcut = {
  keys: string;
  action: string;
};

export class HotKeyManager {
  private shortcuts: Map<string, string> = new Map();
  private events: Map<string, (() => void)[]> = new Map();
  private enabled: boolean = true;
  private keyDownHandler: (e: KeyboardEvent) => void;

  constructor(shortcuts: Shortcut[] = []) {
    this.keyDownHandler = this.handleKeyDown.bind(this);
    this.setShortcuts(shortcuts);
    window.addEventListener('keydown', this.keyDownHandler);
  }

  private normalizeKeys(e: KeyboardEvent): string {
    const keys = [];

    if (e.ctrlKey) keys.push('Ctrl');
    if (e.metaKey) keys.push('Meta');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');

    const key = this.normalizeKeyName(e.key);
    if (!['Control', 'Meta', 'Alt', 'Shift'].includes(key)) {
      keys.push(key);
    }

    return keys.join('+');
  }

  private normalizeKeyName(key: string): string {
    const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (arrowKeys.includes(key)) return key; // Preserve case for arrows

    return key.length === 1 ? key.toUpperCase() : this.capitalize(key);
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (!this.enabled) return;
    const normalizedKey = this.normalizeKeys(e);
    const action = this.shortcuts.get(normalizedKey);
    if (action) {
      e.preventDefault();
      this.dispatch(action);
    }
  }

  setShortcuts(shortcuts: Shortcut[]) {
    this.shortcuts.clear();
    for (const { keys, action } of shortcuts) {
      const normalized = this.normalizeShortcut(keys);
      this.shortcuts.set(normalized, action);
    }
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

  private normalizeShortcut(keys: string): string {
    return keys
      .split('+')
      .map(k => {
        const key = k.trim().toLowerCase();
        switch (key) {
          case 'ctrl':
            return 'Ctrl';
          case 'meta':
          case 'cmd':
          case 'command':
            return 'Meta';
          case 'alt':
            return 'Alt';
          case 'shift':
            return 'Shift';
          case 'arrowup':
            return 'ArrowUp';
          case 'arrowdown':
            return 'ArrowDown';
          case 'arrowleft':
            return 'ArrowLeft';
          case 'arrowright':
            return 'ArrowRight';
          default:
            return key.length === 1 ? key.toUpperCase() : this.capitalize(key);
        }
      })
      .join('+');
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  clear() {
    this.shortcuts.clear();
  }

  destroy() {
    window.removeEventListener('keydown', this.keyDownHandler);
    this.clear();
  }
}
