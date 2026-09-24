import { FormEvent, useEffect, useRef, useState } from "react";
import { bindEscapeToCancel } from "../escape-to-cancel";
import {
  HALF_LIFE_POINTS_VALUE,
  LifePointsMode,
  lifePointsValue,
  parseLifePointsAmount,
  previewLifePoints,
} from "./life-points";

const stopPointer = (e: React.SyntheticEvent) => e.stopPropagation();

const MODES: { mode: LifePointsMode; label: string }[] = [
  { mode: "damage", label: "Damage" },
  { mode: "gain", label: "Gain" },
  { mode: "set", label: "Set to" },
];

const QUICK: { label: string; title: string; value: string }[] = [
  { label: "−500", title: "Take 500 damage", value: lifePointsValue("damage", 500, 0) },
  { label: "−1000", title: "Take 1000 damage", value: lifePointsValue("damage", 1000, 0) },
  { label: "+500", title: "Gain 500 LP", value: lifePointsValue("gain", 500, 0) },
  { label: "Half", title: "Halve LP (rounded up)", value: HALF_LIFE_POINTS_VALUE },
];

/** Inline LP editor replacing the old blocking prompt("LPS:"): quick
 * buttons for the common changes plus an explicit Damage / Gain / Set. */
export function LifePointsPopover({ playerName, currentLp, onApply, onClose }: {
  playerName: string;
  currentLp: number;
  onApply: (value: string) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<LifePointsMode>("damage");
  const [raw, setRaw] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const amount = parseLifePointsAmount(raw);
  const invalid = raw.trim() !== "" && amount === null;

  useEffect(() => {
    inputRef.current?.focus();
    const unbindEscape = bindEscapeToCancel(document, onClose);
    // The popover's parent also holds the LP readout that toggles it, so a
    // click there is left to that toggle instead of closing-then-reopening.
    const onOutside = (event: MouseEvent) => {
      const anchor = rootRef.current?.parentElement ?? rootRef.current;
      if (anchor && !anchor.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onOutside, { capture: true });
    return () => {
      unbindEscape();
      document.removeEventListener("mousedown", onOutside, { capture: true });
    };
  }, [onClose]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (amount === null) return;
    onApply(lifePointsValue(mode, amount, currentLp));
  };

  return <div
    ref={rootRef}
    className="ygo-lp-popover"
    role="dialog"
    aria-label={`Change ${playerName}'s life points`}
    onMouseDown={stopPointer}
    onMouseUp={stopPointer}
    onClick={stopPointer}
  >
    <div className="ygo-lp-popover-title">{playerName} · {currentLp} LP</div>
    <div className="ygo-lp-popover-quick">
      {QUICK.map(q => <button
        key={q.label}
        type="button"
        className="ygo-btn ygo-btn-action ygo-btn-sm"
        title={q.title}
        aria-label={q.title}
        onClick={() => onApply(q.value)}
      >
        {q.label}
      </button>)}
    </div>
    <form onSubmit={submit} className="ygo-lp-popover-form">
      <div className="ygo-lp-popover-modes" role="radiogroup" aria-label="Change type">
        {MODES.map(m => <button
          key={m.mode}
          type="button"
          role="radio"
          aria-checked={mode === m.mode}
          className={`ygo-btn ygo-btn-sm ${mode === m.mode ? "ygo-btn-primary" : "ygo-btn-action"}`}
          onClick={() => setMode(m.mode)}
        >
          {m.label}
        </button>)}
      </div>
      <div className="ygo-lp-popover-row">
        <input
          ref={inputRef}
          className="ygo-input"
          type="text"
          inputMode="numeric"
          placeholder="Amount"
          aria-label="Amount"
          aria-invalid={invalid}
          value={raw}
          onChange={e => setRaw(e.target.value)}
        />
        <button type="submit" className="ygo-btn ygo-btn-primary ygo-btn-sm" disabled={amount === null}>
          Apply
        </button>
      </div>
      <div className={`ygo-lp-popover-hint${invalid ? " ygo-lp-popover-error" : ""}`} aria-live="polite">
        {invalid
          ? "Enter a whole number, like 800."
          : amount !== null
            ? `LP will be ${previewLifePoints(mode, amount, currentLp)}`
            : " "}
      </div>
    </form>
  </div>
}
