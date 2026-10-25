import { useEffect, useRef, useState } from "react";
import type { YGODuel } from "../../core/YGODuel";
import { stopPropagationCallback } from "../../scripts/utils";
import { CHAIN_STOP_CHOICES } from "./chain-stops-control";
import type { ChainStops } from "./duel-preferences";

/** The mode as the button's badge (Master Duel's chain button reads OFF / AUTO / ON). */
export const CHAIN_STOP_BADGE: Record<ChainStops, string> = { off: "OFF", auto: "AUTO", always: "ON", bluff: "BLUFF" };

/** The next mode a tap moves to: Off → Auto → On (Always) → Bluff → Off. */
export function nextChainStops(mode: ChainStops): ChainStops {
  const order: ChainStops[] = ["off", "auto", "always", "bluff"];
  return order[(order.indexOf(mode) + 1) % order.length];
}

/** How long the hint about the new mode stays up after a tap. */
const HINT_MS = 2200;

/**
 * Master Duel-style chain button among the bottom-right buttons: a round button with the current
 * Chain stops mode on it; each tap moves to the next mode (Off → Auto → On → Bluff) and shows a
 * short hint above it on what that mode does. Only in Assisted Mode duels (duel.chainStops is
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
  const cycle = (e: React.MouseEvent) => {
    stopPropagationCallback(e);
    const next = nextChainStops(mode);
    live.set(next);
    const choice = CHAIN_STOP_CHOICES.find((c) => c.value === next);
    setHint(choice ? `${CHAIN_STOP_BADGE[next]}: ${choice.hint}` : null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setHint(null), HINT_MS);
  };
  return (
    <div className="ygo-chain-stops-button-wrap" onClick={stopPropagationCallback} onMouseDown={stopPropagationCallback} onMouseUp={stopPropagationCallback}>
      {hint && <div className="ygo-chain-stops-hint" role="status" aria-live="polite">{hint}</div>}
      <button
        type="button"
        className="ygo-floating-button ygo-chain-stops-button"
        aria-label={`Chain stops: ${CHAIN_STOP_BADGE[mode]}. Tap to change`}
        title={`Chain stops: ${CHAIN_STOP_BADGE[mode]} (tap to change)`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={cycle}
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
