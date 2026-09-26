/**
 * The player's own settings for a server duel (ygo-socket-server
 * duel:preferences:set, utils/duelPreferences.ts). For now one:
 * chainStops — in Assisted Mode, which of your chain windows pause for you
 * (the bot's turn waits there too):
 *  - "auto": only when you have a card you can chain (the default);
 *  - "always": every window, even with nothing to chain;
 *  - "off": never, unless the chain is forced — the rest are passed for you.
 *
 * The server keeps it per duel; the last choice is remembered in this
 * browser and sent again when the next duel starts.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { YGODuel } from "../../core/YGODuel";

export type ChainStops = "auto" | "always" | "off";

export interface DuelPreferences {
  chainStops?: ChainStops;
}

const CHAIN_STOPS: readonly ChainStops[] = ["auto", "always", "off"];
const STORAGE_KEY = "ygo-player:chain-stops";
/** The older on/off switch. Not carried over — Assisted Mode starts on Auto — only cleared. */
const LEGACY_STORAGE_KEY = "ygo-player:stop-at-every-window";

const isChainStops = (v: unknown): v is ChainStops => CHAIN_STOPS.includes(v as ChainStops);

export function storedChainStops(storage: Pick<Storage, "getItem"> | undefined = safeStorage()): ChainStops {
  try {
    const value = storage?.getItem(STORAGE_KEY);
    return isChainStops(value) ? value : "auto";
  } catch {
    return "auto";
  }
}

export function storeChainStops(value: ChainStops, storage: Pick<Storage, "setItem" | "removeItem"> | undefined = safeStorage()): void {
  try {
    storage?.removeItem(LEGACY_STORAGE_KEY);
    if (value === "auto") storage?.removeItem(STORAGE_KEY);
    else storage?.setItem(STORAGE_KEY, value);
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

/** The preferences in a duel:preferences event, or null. An older server
 * only knows stopAtEveryWindow: true there means "always". */
export function readPreferences(data: unknown): DuelPreferences | null {
  const prefs = (data as { preferences?: unknown } | null)?.preferences;
  if (!prefs || typeof prefs !== "object") return null;
  const { chainStops, stopAtEveryWindow } = prefs as { chainStops?: unknown; stopAtEveryWindow?: unknown };
  if (isChainStops(chainStops)) return { chainStops };
  if (typeof stopAtEveryWindow === "boolean") return { chainStops: stopAtEveryWindow ? "always" : "auto" };
  return {};
}

/** What duel:preferences:set carries for `mode` (stopAtEveryWindow for servers that predate chainStops). */
export function preferencesPayload(mode: ChainStops) {
  return { chainStops: mode, stopAtEveryWindow: mode === "always" };
}

/**
 * Chain stops for this duel: the server's value once it answered, the
 * remembered one before. `enabled` = an Assisted Mode server duel.
 *
 * Holding OK (auto-pass, YGODuel.continuousAccept) means "Off" for as long as
 * it lasts: it ends as it always has, at the next turn or on your next move,
 * and your own setting comes back. It is never remembered. The other way
 * round, the setting is published on duel.chainStops: Off lights the OK
 * button, and holding OK then sets it back to Auto. Returns
 * [the setting in effect, set your setting, whether it's the held OK].
 */
export function useChainStops(duel: YGODuel, enabled: boolean): [ChainStops, (value: ChainStops) => void, boolean] {
  const [value, setValue] = useState<ChainStops>(() => storedChainStops());
  const [held, setHeld] = useState<boolean>(() => !!duel.continuousAccept);
  const valueRef = useRef(value);
  valueRef.current = value;
  const heldRef = useRef(held);
  heldRef.current = held;

  useEffect(() => {
    const onRender = () => setHeld(!!duel.continuousAccept);
    duel.events.on("render-ui", onRender);
    return () => duel.events.off("render-ui", onRender);
  }, [duel]);

  useEffect(() => {
    if (!enabled) return;
    const onPreferences = (data: unknown) => {
      // While OK is held the server says "off": that isn't the player's own setting.
      if (heldRef.current) return;
      const prefs = readPreferences(data);
      if (prefs?.chainStops) setValue(prefs.chainStops);
    };
    duel.events.on("duel-preferences", onPreferences);
    // Auto is the server's default: only a remembered other choice needs sending.
    const stored = storedChainStops();
    if (stored !== "auto") duel.serverActions?.room.send("duel:preferences:set", preferencesPayload(stored));
    return () => duel.events.off("duel-preferences", onPreferences);
  }, [duel, enabled]);

  // OK held → Off on the server; released → the player's own setting again.
  const sentHeld = useRef(false);
  useEffect(() => {
    if (!enabled || held === sentHeld.current) return;
    sentHeld.current = held;
    duel.serverActions?.room.send("duel:preferences:set", preferencesPayload(held ? "off" : valueRef.current));
  }, [duel, enabled, held]);

  const set = useCallback((next: ChainStops) => {
    // Picking a setting ends a held OK, like any other move.
    if (duel.continuousAccept) {
      duel.continuousAccept = false;
      sentHeld.current = false;
      setHeld(false);
      duel.events.dispatch("render-ui");
    }
    setValue(next);
    storeChainStops(next);
    duel.serverActions?.room.send("duel:preferences:set", preferencesPayload(next));
  }, [duel]);

  useEffect(() => {
    if (!enabled) return;
    duel.chainStops = { value, set };
    duel.events.dispatch("render-ui");
    return () => {
      duel.chainStops = null;
      duel.events.dispatch("render-ui");
    };
  }, [duel, enabled, value, set]);

  return [enabled && held ? "off" : value, set, enabled && held];
}
