import { useEffect, useRef, useState } from "react";
import type { YGODuel } from "../../core/YGODuel";
import { safeGetItem, safeSetItem } from "../../scripts/safe-storage";
import { stopPropagationCallback } from "../../scripts/utils";
import { CHAIN_STOP_CHOICES } from "./chain-stops-control";
import type { ChainStops } from "./duel-preferences";

/** The mode as the button's badge (Master Duel's chain button reads OFF / AUTO / ON). */
export const CHAIN_STOP_BADGE: Record<ChainStops, string> = { off: "OFF", auto: "AUTO", always: "ON", bluff: "BLUFF" };

/** The modes in button order: Off and On side by side, so one click (left or right) switches them. */
const CHAIN_STOP_ORDER: ChainStops[] = ["off", "always", "auto", "bluff"];

/** The mode a left click (step 1) or right click (step -1) moves to: Off ↔ On ↔ Auto ↔ Bluff ↔ Off. */
export function nextChainStops(mode: ChainStops, step: 1 | -1 = 1): ChainStops {
  const n = CHAIN_STOP_ORDER.length;
  return CHAIN_STOP_ORDER[(CHAIN_STOP_ORDER.indexOf(mode) + step + n) % n];
}

/** How long the hint about the new mode stays up after a click. */
const HINT_MS = 2200;

/** The modes whose hint was already shown in this browser (each one shows once). */
const HINTS_SEEN_KEY = "ygo_chain_stops_hints_seen";

/** True the first time a mode is picked here (and remembers it); false after that. */
export function firstPickOf(mode: ChainStops, storage?: Pick<Storage, "getItem" | "setItem">): boolean {
  const seen = (safeGetItem(HINTS_SEEN_KEY, storage) ?? "").split(",").filter(Boolean);
  if (seen.includes(mode)) return false;
  safeSetItem(HINTS_SEEN_KEY, [...seen, mode].join(","), storage);
  return true;
}

/**
 * Master Duel-style chain button among the bottom-right buttons: a round button with the current
 * Chain stops mode on it; a left click moves to the next mode (Off → On → Auto → Bluff), a right
 * click back to the previous one. The first time a mode is picked here a short hint above the
 * button says what it does; after that only the badge changes. Only in Assisted Mode duels (duel.chainStops is
 * published by the options panel's useChainStops).
 */
export function ChainStopsButton({ duel }: { duel: YGODuel }) {
  const [hint, setHint] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const live = duel.chainStops;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (!live) return null;
  // Holding OK passes everything: the button shows OFF for as long as it lasts.
  const held = !!duel.continuousAccept;
  const mode: ChainStops = held ? "off" : live.value;
  const cycle = (e: React.MouseEvent, step: 1 | -1) => {
    stopPropagationCallback(e);
    e.preventDefault();
    const next = nextChainStops(mode, step);
    live.set(next);
    if (timer.current) clearTimeout(timer.current);
    const choice = firstPickOf(next) ? CHAIN_STOP_CHOICES.find((c) => c.value === next) : undefined;
    setHint(choice ? `${CHAIN_STOP_BADGE[next]}: ${choice.hint}` : null);
    if (choice) timer.current = setTimeout(() => setHint(null), HINT_MS);
  };
  return (
    <div className="ygo-chain-stops-button-wrap" onClick={stopPropagationCallback} onMouseDown={stopPropagationCallback} onMouseUp={stopPropagationCallback}>
      {hint && <div className="ygo-chain-stops-hint" role="status" aria-live="polite">{hint}</div>}
      <button
        type="button"
        className="ygo-floating-button ygo-chain-stops-button"
        aria-label={`Chain stops: ${CHAIN_STOP_BADGE[mode]}. Click for the next mode, right-click for the previous`}
        title={`Chain stops: ${CHAIN_STOP_BADGE[mode]} (click: next, right-click: previous)`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => cycle(e, 1)}
        onContextMenu={(e) => cycle(e, -1)}
      >
        <svg className="ygo-floating-button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span className={`ygo-chain-stops-badge ygo-chain-stops-${mode}`} aria-hidden="true">{CHAIN_STOP_BADGE[mode]}</span>
      </button>
    </div>
  );
}
