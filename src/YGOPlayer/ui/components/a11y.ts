import type { KeyboardEvent, SyntheticEvent } from "react";

/** Keys that activate a button: Enter and Space. */
export function isActivationKey(key: string): boolean {
  return key === "Enter" || key === " " || key === "Spacebar";
}

/**
 * onKeyDown handler that runs `handler` on Enter/Space, like a native button.
 * Keys pressed inside nested controls are ignored.
 */
export function onActivateKey<T extends Element = Element>(
  handler: (e: KeyboardEvent<T>) => void,
) {
  return (e: KeyboardEvent<T>) => {
    if (e.target !== e.currentTarget || !isActivationKey(e.key)) return;
    e.preventDefault();
    handler(e);
  };
}

/**
 * Props that make a div/img behave like a button for keyboard and
 * screen-reader users, where a real <button> would break the player's styling.
 * Returns an empty object when `handler` is undefined.
 */
export function clickableProps<T extends Element = Element>(
  handler: ((e: SyntheticEvent<T>) => void) | undefined,
  label?: string,
) {
  if (!handler) return {};
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: handler,
    onKeyDown: onActivateKey<T>(handler),
    ...(label ? { "aria-label": label } : {}),
  };
}
