import { useRef } from "react";
import { HIGHLIGHT_CSS } from "../../game/meshes/highlight-frame";
import type { ChainStops } from "./duel-preferences";

export const CHAIN_STOP_CHOICES: ReadonlyArray<{ value: ChainStops; label: string; hint: string }> = [
  { value: "off", label: "Off", hint: "Never pauses unless a chain is forced. Faster, but your hand traps and set cards stay unused." },
  { value: "auto", label: "Auto", hint: "Pauses when you have a card that answers what just happened: a summon, an activation, an attack." },
  { value: "always", label: "Always", hint: "Pauses at every chance you have to activate something, phase changes and battle steps included." },
  { value: "bluff", label: "Bluff", hint: "Pauses at every chance to respond, even with nothing to activate, so your pauses give nothing away." },
];

/**
 * "Chain stops": which of your chain windows pause for you — Off, Auto, Always or Bluff. Holding OK shows here as Off (`held`), for as long as it lasts. A labelled segmented switch at the foot of the
 * panel, split from the options by a hairline, with a line on what the
 * current choice does.
 */
export function ChainStopsControl({ value, held, onChange }: { value: ChainStops; held: boolean; onChange: (value: ChainStops) => void }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = CHAIN_STOP_CHOICES.find((c) => c.value === value) ?? CHAIN_STOP_CHOICES.find((c) => c.value === "auto")!;
  const pick = (i: number) => {
    const n = CHAIN_STOP_CHOICES.length;
    const index = (i + n) % n;
    onChange(CHAIN_STOP_CHOICES[index].value);
    refs.current[index]?.focus();
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4, paddingTop: 8, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
      {/* Label above the switch: four segments next to it overflowed the panel (Bluff cut off). */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 5 }}>
        <span id="ygo-chain-stops-label" style={{ fontSize: 12, fontWeight: 600 }}>Chain stops</span>
        <div
          role="radiogroup"
          aria-labelledby="ygo-chain-stops-label"
          aria-describedby="ygo-chain-stops-hint"
          style={{ display: "flex", width: "100%", boxSizing: "border-box", padding: 2, borderRadius: 6, background: "rgba(0, 0, 0, 0.35)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
        >
          {CHAIN_STOP_CHOICES.map((c, i) => {
            const active = c.value === value;
            return (
              <button
                key={c.value}
                ref={(el) => { refs.current[i] = el; }}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onClick={() => onChange(c.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); pick(i + 1); }
                  if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); pick(i - 1); }
                }}
                style={{
                  flex: 1, minWidth: 0, border: "none", cursor: "pointer", borderRadius: 4, padding: "3px 4px",
                  fontSize: 12, fontWeight: 600, lineHeight: 1.3,
                  color: active ? "#111" : "inherit",
                  background: active ? HIGHLIGHT_CSS : "transparent",
                  opacity: active ? 1 : 0.7,
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
      <div id="ygo-chain-stops-hint" style={{ fontSize: 11, lineHeight: 1.35, opacity: 0.6 }}>
        {held ? "Off while OK is held: ends at the next turn or your next move." : current.hint}
      </div>
    </div>
  );
}
