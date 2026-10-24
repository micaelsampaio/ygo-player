/**
 * Master Duel style prompt dialog: a dark navy panel with cut corners over
 * the lower middle of the board, the question with its key words in yellow,
 * the candidate cards as thumbnails grouped by location, and a footer of two
 * angled buttons. A chevron tab hides the panel to peek at the board (the
 * prompt stays held and its board picks keep working).
 */
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { highlightSegments, LocationGroup, LocationKind } from "./prompt-dialog";
import "./style.css";

const stop = (e: { stopPropagation(): void }) => e.stopPropagation();
/** Mouse clicks don't focus the tab: Space stays the panel's Continue / Don't respond. */
const keepFocusOff = (e: { preventDefault(): void }) => e.preventDefault();

/** The dialog's shell. `resetKey` changing (a new question) brings a peeked dialog back. */
export function MdPromptDialog({ label, className, resetKey, children }: {
  label: string;
  className?: string;
  resetKey?: string;
  children: ReactNode;
}) {
  const [peek, setPeek] = useState(false);
  useEffect(() => setPeek(false), [resetKey]);
  return (
    <div
      className={`ygo-card-menu ygo-assist-prompt-dialog ygo-md-prompt${className ? ` ${className}` : ""}${peek ? " is-peeking" : ""}`}
      role="dialog"
      aria-label={label}
      onClick={stop}
      onMouseDown={stop}
      onMouseUp={stop}
      onMouseMove={stop}
      onWheel={stop}
    >
      <button
        type="button"
        className="ygo-md-prompt-peek"
        onMouseDown={keepFocusOff}
        onClick={() => setPeek((p) => !p)}
        aria-expanded={!peek}
        aria-label={peek ? "Show the question" : "Hide the question to see the board"}
        title={peek ? "Show the question" : "Hide to see the board"}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="ygo-md-prompt-chevron">
          <path d="M3 6 L12 15 L21 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="miter" />
          <path d="M7 6 L12 11 L17 6" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.6" />
        </svg>
      </button>
      <div className="ygo-md-prompt-content" aria-hidden={peek || undefined}>
        {children}
      </div>
    </div>
  );
}

/** The question line, its key words (card names, steps, phases) in yellow, and an optional smaller line. */
export function PromptQuestion({ text, terms, sub }: { text: string; terms: ReadonlyArray<string | null | undefined>; sub?: string | null }) {
  return (
    <div className="ygo-md-prompt-question">
      <div className="ygo-md-prompt-question-text">
        {highlightSegments(text, terms).map((s, i) => s.highlight
          ? <span key={i} className="ygo-md-prompt-keyword">{s.text}</span>
          : <span key={i}>{s.text}</span>)}
      </div>
      {sub && <div className="ygo-md-prompt-question-sub">{sub}</div>}
    </div>
  );
}

/** A small glyph for a location group's tab: the field's zones, a fanned hand, a tombstone… */
export function LocationIcon({ location }: { location: LocationKind }) {
  const common = { viewBox: "0 0 20 20", width: 16, height: 16, "aria-hidden": true as const, fill: "none", stroke: "currentColor", strokeWidth: 1.6 };
  switch (location) {
    case "field":
      return <svg {...common}><rect x="2.5" y="4" width="15" height="12" rx="1.5" /><path d="M7.5 4v12M12.5 4v12M2.5 10h15" /></svg>;
    case "hand":
      return <svg {...common}><rect x="3" y="5" width="7" height="10" rx="1" transform="rotate(-14 6.5 10)" /><rect x="10" y="5" width="7" height="10" rx="1" transform="rotate(14 13.5 10)" /></svg>;
    case "gy":
      return <svg {...common}><path d="M5 17V8a5 5 0 0 1 10 0v9z" /><path d="M10 7v6M7.5 9.5h5M3 17h14" /></svg>;
    case "banished":
      return <svg {...common}><circle cx="10" cy="10" r="6.5" /><path d="M5.5 14.5l9-9" /></svg>;
    case "extra":
    case "deck":
      return <svg {...common}><rect x="5" y="3" width="10" height="13" rx="1" /><path d="M3 6v11h10" /></svg>;
    default:
      return <svg {...common}><rect x="5" y="3" width="10" height="14" rx="1" /></svg>;
  }
}

export interface ThumbView {
  key: string;
  /** 0: a hidden card (shown as its back). */
  code: number;
  name: string;
  imageUrl?: string;
  selected?: boolean;
  busy?: boolean;
  /** "×2" or a picked count, shown at the card's corner. */
  badge?: string;
  /** Shown on the card's top: how many of it are picked (multi-pick prompts). */
  check?: string;
  onClick: () => void;
  onDoubleClick?: () => void;
  onHover?: (on: boolean) => void;
}

/** The candidate cards, one blue rounded group per location, each with its location tab. */
export function CardThumbGroups({ groups, disabled }: { groups: LocationGroup<ThumbView>[]; disabled?: boolean }) {
  return (
    <div className="ygo-md-prompt-groups">
      {groups.map((group) => (
        <div key={group.key} className={`ygo-md-prompt-group${group.mine ? "" : " is-opponent"}`} role="group" aria-label={group.label}>
          <div className="ygo-md-prompt-group-tab" title={group.label}>
            <LocationIcon location={group.location} />
            <span className="ygo-md-prompt-group-label">{group.label}</span>
          </div>
          <div className="ygo-md-prompt-thumbs">
            {group.items.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`ygo-md-prompt-thumb${t.selected ? " is-selected" : ""}`}
                aria-pressed={t.selected}
                aria-label={`${t.name}${t.badge ? ` ${t.badge}` : ""}${t.selected ? ", selected" : ""}`}
                title={t.name}
                disabled={disabled}
                aria-busy={t.busy}
                onClick={t.onClick}
                onDoubleClick={t.onDoubleClick}
                onMouseEnter={() => t.onHover?.(true)}
                onMouseLeave={() => t.onHover?.(false)}
                onFocus={() => t.onHover?.(true)}
                onBlur={() => t.onHover?.(false)}
              >
                {t.code !== 0 && t.imageUrl
                  ? <img src={t.imageUrl} alt="" className="ygo-md-prompt-thumb-img" draggable={false} />
                  : <span className="ygo-md-prompt-thumb-img ygo-md-prompt-thumb-back" aria-hidden="true">{t.code === 0 ? "" : t.name}</span>}
                {t.badge && <span className="ygo-md-prompt-thumb-badge">{t.badge}</span>}
                {t.check && <span className="ygo-md-prompt-thumb-check" aria-hidden="true">{t.check}</span>}
                {t.busy && <span className="ygo-md-prompt-thumb-busy" aria-hidden="true"><span className="ygo-inline-spinner" /></span>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** One of the footer's angled buttons: "primary" (Effect Activation / Confirm / Yes) or "secondary" (Cancel / No). */
export function MdButton({ variant, busy, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant: "primary" | "secondary";
  busy?: boolean;
}) {
  return (
    <button type="button" {...rest} aria-busy={busy || undefined} className={`ygo-md-prompt-button is-${variant}${className ? ` ${className}` : ""}`}>
      <span className="ygo-md-prompt-button-label">{busy ? <span className="ygo-inline-spinner" aria-hidden="true" /> : children}</span>
    </button>
  );
}

/** The footer row the buttons sit in. */
export function MdFooter({ children }: { children: ReactNode }) {
  return <div className="ygo-md-prompt-footer">{children}</div>;
}
