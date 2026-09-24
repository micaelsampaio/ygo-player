import { useCallback, useState } from "react";
import { YGOClientType } from "ygo-core";
import { YGODuel } from "../../../core/YGODuel";
import {
  FIRST_DUEL_TIPS,
  dismissFirstDuelTips,
  hasDismissedFirstDuelTips,
  shouldOfferFirstDuelTips,
} from "./first-duel-tips-storage";
import "./style.css";

const stopPointer = (e: React.SyntheticEvent) => e.stopPropagation();

/** Short dismissible walkthrough shown until the viewer closes it once. */
export function FirstDuelTips({ duel }: { duel: YGODuel }) {
  const [open, setOpen] = useState(() => shouldOfferFirstDuelTips({
    isPlayerClient: duel.client?.type === YGOClientType.PLAYER,
    gameMode: duel.config.gameMode,
  }) && !hasDismissedFirstDuelTips());
  const [step, setStep] = useState(0);

  const close = useCallback(() => {
    dismissFirstDuelTips();
    setOpen(false);
  }, []);

  if (!open) return null;

  const tip = FIRST_DUEL_TIPS[step];
  const isLast = step === FIRST_DUEL_TIPS.length - 1;

  return <div
    className="ygo-first-duel-tips"
    role="region"
    aria-label="Duel tips"
    onMouseDown={stopPointer}
    onMouseUp={stopPointer}
    onClick={stopPointer}
    onPointerDown={stopPointer}
  >
    <div className="ygo-first-duel-tips-header">
      <span className="ygo-first-duel-tips-step">Tip {step + 1} of {FIRST_DUEL_TIPS.length}</span>
      <button type="button" className="ygo-first-duel-tips-close" onClick={close} aria-label="Dismiss tips" title="Dismiss tips">✕</button>
    </div>
    <div className="ygo-first-duel-tips-title">{tip.title}</div>
    <p className="ygo-first-duel-tips-body">{tip.body}</p>
    <div className="ygo-first-duel-tips-actions">
      <button type="button" className="ygo-btn ygo-btn-action ygo-btn-sm" onClick={close}>
        Skip
      </button>
      <div className="ygo-flex ygo-gap-1">
        {step > 0 && <button type="button" className="ygo-btn ygo-btn-action ygo-btn-sm" onClick={() => setStep(s => s - 1)}>
          Back
        </button>}
        <button
          type="button"
          className="ygo-btn ygo-btn-primary ygo-btn-sm"
          onClick={() => isLast ? close() : setStep(s => s + 1)}
        >
          {isLast ? "Got it" : "Next"}
        </button>
      </div>
    </div>
  </div>
}
