/**
 * Whether the field card-count overlay is showing. Two inputs drive it: the
 * "card counts" toggle button (pinned) and holding the middle mouse button
 * (held, a peek that ends on release). The overlay shows while either is on,
 * and the button's pressed state follows `visible`, so a middle-mouse peek
 * lights the button up and releasing it restores whatever the button had.
 * No three / React imports, so it stays unit-testable on its own.
 */
export class FieldStatsVisibility {
  private pinned = false;
  private held = false;
  private listeners = new Set<(visible: boolean) => void>();

  get visible(): boolean {
    return this.pinned || this.held;
  }

  /** Button click: hide if showing (including mid-peek), otherwise pin it on. */
  toggle() {
    if (this.visible) {
      this.pinned = false;
      this.held = false;
    } else {
      this.pinned = true;
    }
    this.emit();
  }

  setPinned(pinned: boolean) {
    const before = this.visible;
    this.pinned = pinned;
    if (!pinned) this.held = false;
    if (this.visible !== before) this.emit();
  }

  setHeld(held: boolean) {
    if (this.held === held) return;
    const before = this.visible;
    this.held = held;
    if (this.visible !== before) this.emit();
  }

  subscribe(listener: (visible: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  clear() {
    this.listeners.clear();
  }

  private emit() {
    const visible = this.visible;
    this.listeners.forEach(listener => listener(visible));
  }
}
