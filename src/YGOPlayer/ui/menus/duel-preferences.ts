/**
 * The player's own settings for a server duel (ygo-socket-server
 * duel:preferences:set, utils/duelPreferences.ts). For now one:
 * stopAtEveryWindow — in Assisted Mode, stop at every chain window of yours
 * (the bot's turn waits there too), even when you have nothing to chain.
 *
 * The server keeps it per duel; the last choice is remembered in this
 * browser and sent again when the next duel starts.
 */
import { useCallback, useEffect, useState } from "react";
import type { YGODuel } from "../../core/YGODuel";

export interface DuelPreferences {
  stopAtEveryWindow?: boolean;
}

const STORAGE_KEY = "ygo-player:stop-at-every-window";

export function storedStopAtEveryWindow(storage: Pick<Storage, "getItem"> | undefined = safeStorage()): boolean {
  try {
    return storage?.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function storeStopAtEveryWindow(value: boolean, storage: Pick<Storage, "setItem" | "removeItem"> | undefined = safeStorage()): void {
  try {
    if (value) storage?.setItem(STORAGE_KEY, "1");
    else storage?.removeItem(STORAGE_KEY);
  } catch {
    // Private mode / blocked storage: the setting just isn't remembered.
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/** The preferences in a duel:preferences event, or null. */
export function readPreferences(data: unknown): DuelPreferences | null {
  const prefs = (data as { preferences?: unknown } | null)?.preferences;
  if (!prefs || typeof prefs !== "object") return null;
  const stop = (prefs as { stopAtEveryWindow?: unknown }).stopAtEveryWindow;
  return typeof stop === "boolean" ? { stopAtEveryWindow: stop } : {};
}

/**
 * "Stop at every window" for this duel: the server's value once it answered,
 * the remembered one before. `enabled` = an Assisted Mode server duel.
 */
export function useStopAtEveryWindow(duel: YGODuel, enabled: boolean): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => storedStopAtEveryWindow());

  useEffect(() => {
    if (!enabled) return;
    const onPreferences = (data: unknown) => {
      const prefs = readPreferences(data);
      if (prefs && typeof prefs.stopAtEveryWindow === "boolean") setValue(prefs.stopAtEveryWindow);
    };
    duel.events.on("duel-preferences", onPreferences);
    // Off is the server's default: only a remembered "on" needs sending.
    if (storedStopAtEveryWindow()) duel.serverActions?.room.send("duel:preferences:set", { stopAtEveryWindow: true });
    return () => duel.events.off("duel-preferences", onPreferences);
  }, [duel, enabled]);

  const set = useCallback((next: boolean) => {
    setValue(next);
    storeStopAtEveryWindow(next);
    duel.serverActions?.room.send("duel:preferences:set", { stopAtEveryWindow: next });
  }, [duel]);

  return [value, set];
}
