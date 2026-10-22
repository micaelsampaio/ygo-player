import { useCallback, useState } from "react";
import { YGOClientType } from "ygo-core";
import type { YGODuel } from "../../../core/YGODuel";
import { isEngineRoom } from "../../../domain/chain-mode";
import {
  FIRST_DUEL_TIPS,
  dismissFirstDuelTips,
  duelTipsKind,
  hasDismissedFirstDuelTips,
  shouldOfferFirstDuelTips,
} from "./first-duel-tips-storage";
import "./style.css";

const stopPointer = (e: React.SyntheticEvent) => e.stopPropagation();

/** Short dismissible walkthrough for this kind of duel, shown until the viewer closes it once. */
export function FirstDuelTips({ duel }: { duel: YGODuel }) {
  const [kind] = useState(() => duelTipsKind({
    engineRoom: isEngineRoom(duel.ygo.options),
    controlsBothSides: !!duel.ygo.options.controlOpponentCards,
  }));
  const tips = FIRST_DUEL_TIPS[kind];
  const [open, setOpen] = useState(() => shouldOfferFirstDuelTips({
    isPlayerClient: duel.client?.type === YGOClientType.PLAYER,
    gameMode: duel.config.gameMode,
  }) && !hasDismissedFirstDuelTips(kind));
  const [step, setStep] = useState(0);

  const close = useCallback(() => {
    dismissFirstDuelTips(kind);
    setOpen(false);
  }, [kind]);

  if (!open) return null;

  const tip = tips[step];
  const isLast = step === tips.length - 1;

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
      <span className="ygo-first-duel-tips-step">Tip {step + 1} of {tips.length}</span>
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
