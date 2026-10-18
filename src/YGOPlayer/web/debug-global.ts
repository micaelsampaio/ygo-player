/**
 * Opt-in debug handle: `window.YGO_WEB_COMPONENT`.
 *
 * The component used to publish itself on `window` whenever the page URL
 * started with `http://localhost`, which leaked the live duel/client object
 * to any script on any localhost-served host page (and the decision was
 * based on the URL rather than on an explicit choice). It is now exposed
 * only when the host or the developer explicitly asks for it:
 *
 *   - the host sets `window.YGO_PLAYER_DEBUG = true` before the element is
 *     created, or
 *   - a developer runs `localStorage.setItem("ygo-player:debug", "1")` in the
 *     devtools console and reloads.
 *
 * Nothing in the monorepo reads `YGO_WEB_COMPONENT`; it is a devtools aid.
 */

export const DEBUG_GLOBAL_NAME = "YGO_WEB_COMPONENT";
export const DEBUG_FLAG_GLOBAL = "YGO_PLAYER_DEBUG";
export const DEBUG_FLAG_STORAGE_KEY = "ygo-player:debug";

type DebugWindow = {
  [DEBUG_GLOBAL_NAME]?: unknown;
  [DEBUG_FLAG_GLOBAL]?: unknown;
  localStorage?: Pick<Storage, "getItem">;
};

export function isDebugGlobalEnabled(win: DebugWindow | undefined): boolean {
  if (!win) return false;
  if (win[DEBUG_FLAG_GLOBAL] === true) return true;
  try {
    return win.localStorage?.getItem(DEBUG_FLAG_STORAGE_KEY) === "1";
  } catch {
    // Storage can throw (sandboxed iframe, blocked site data): treat as off.
    return false;
  }
}

/** Publishes `instance` on `win` when debugging is enabled. Returns whether it did. */
export function exposeDebugGlobal(win: DebugWindow | undefined, instance: unknown): boolean {
  if (!win || !isDebugGlobalEnabled(win)) return false;
  win[DEBUG_GLOBAL_NAME] = instance;
  return true;
}

/** Removes the handle, but only if it still points at `instance`. */
export function clearDebugGlobal(win: DebugWindow | undefined, instance: unknown): void {
  if (win && win[DEBUG_GLOBAL_NAME] === instance) {
    delete win[DEBUG_GLOBAL_NAME];
  }
}
