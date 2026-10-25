import { useEffect, useRef, useState } from "react";
import type { YGODuel } from "../../core/YGODuel";
import { stopPropagationCallback } from "../../scripts/utils";
import { ChainStopsControl } from "./chain-stops-control";
import type { ChainStops } from "./duel-preferences";

/** The mode as the button's badge (Master Duel's chain button reads OFF / AUTO / ON). */
export const CHAIN_STOP_BADGE: Record<ChainStops, string> = { off: "OFF", auto: "AUTO", always: "ON", bluff: "BLUFF" };

/**
 * Master Duel-style chain button among the bottom-right buttons: a round button with the current
 * Chain stops mode on it; a click opens the four choices (with what each does) above it. Only in
 * Assisted Mode duels (duel.chainStops is published by the options panel's useChainStops).
 */
export function ChainStopsButton({ duel }: { duel: YGODuel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const live = duel.chainStops;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("pointerdown", onDown); window.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!live) return null;
  // Holding OK passes everything: the button shows OFF for as long as it lasts.
  const held = !!duel.continuousAccept;
  const mode: ChainStops = held ? "off" : live.value;
  return (
    <div ref={ref} className="ygo-chain-stops-button-wrap" onClick={stopPropagationCallback} onMouseDown={stopPropagationCallback} onMouseUp={stopPropagationCallback}>
      {open && (
        <div className="ygo-card-menu ygo-chain-stops-popover" role="dialog" aria-label="Chain stops">
          <ChainStopsControl value={mode} held={held} onChange={(next) => live.set(next)} />
        </div>
      )}
      <button
        type="button"
        className={`ygo-floating-button ygo-chain-stops-button${open ? " ygo-floating-button-active" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Chain stops: ${CHAIN_STOP_BADGE[mode]}`}
        title="Chain stops"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => { stopPropagationCallback(e); setOpen((v) => !v); }}
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
