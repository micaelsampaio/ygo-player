/**
 * Holds a value back while the board is animating (an activation playing,
 * the bot's spotlight, the moves queued behind it) and hands it over once
 * the board is still: the Assisted Mode panel's new options shouldn't show
 * while the card they answer is still being played. With nothing animating
 * a value goes straight through. Only the newest held value is kept.
 */
export interface AnimationGate<T> {
  /** Applies `value` now, or holds it until `flush` finds the board still. Returns whether it was applied. */
  offer(value: T): boolean;
  /** Applies the held value, if any, once nothing is animating. Returns whether it applied one. */
  flush(): boolean;
  readonly holding: boolean;
}

export function createAnimationGate<T>(isAnimating: () => boolean, apply: (value: T) => void): AnimationGate<T> {
  let held: { value: T } | null = null;
  return {
    offer(value) {
      if (isAnimating()) {
        held = { value };
        return false;
      }
      held = null;
      apply(value);
      return true;
    },
    flush() {
      if (!held || isAnimating()) return false;
      const { value } = held;
      held = null;
      apply(value);
      return true;
    },
    get holding() {
      return held !== null;
    },
  };
}
