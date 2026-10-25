import { useEffect, useRef, useState } from "react";
import type { YGODuel } from "../../../core/YGODuel";
import {
  activationBanner,
  activationBannerMs,
  activationTitle,
  pushActivationBanner,
  type ActivationBannerItem,
} from "./activation-banner";
import "./style.css";

interface Shown extends ActivationBannerItem {
  ms: number;
}

/**
 * Master Duel-style banner for the opponent's activations: a slim text label
 * in the upper middle of the field ("▲ Opponent activated a Trap" over the
 * card's name and chain link). Purely visual: it never holds the duel's
 * animations, and clicks pass through. Up to three stack, newest on top.
 */
export function ActivationBanner({ duel }: { duel: YGODuel }) {
  const [shown, setShown] = useState<Shown[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const abort = new AbortController();
    const timers = new Set<ReturnType<typeof setTimeout>>();

    duel.events.on("card-activated", (event) => {
      const content = activationBanner(event, {
        isOpponent: duel.perspective.getPlayerCssIndex(event.player) === 1,
        enabled: duel.settings.getConfigFromPath("showOpponentActivations") !== false,
        recovering: !!duel.commands?.isRecovering(),
      });
      if (!content) return;
      const id = nextId.current++;
      const ms = activationBannerMs(duel.core.timeScale);
      setShown((list) => pushActivationBanner(list, { ...content, id, ms }));
      const timer = setTimeout(() => {
        timers.delete(timer);
        setShown((list) => list.filter((s) => s.id !== id));
      }, ms);
      timers.add(timer);
    }, { signal: abort.signal });

    return () => {
      abort.abort();
      timers.forEach(clearTimeout);
      // A new duel in the same root: banners still up would never get their removal timer.
      setShown([]);
    };
  }, [duel]);

  return (
    <div className="ygo-activation-banners" role="status" aria-live="polite">
      {shown.map((s) => {
        const title = activationTitle(s);
        return (
          <div
            key={s.id}
            className={`ygo-activation-banner ygo-activation-${s.kind}`}
            style={{ animationDuration: `${s.ms}ms` }}
            title={title}
          >
            <div className="ygo-activation-banner-label"><span aria-hidden="true">▲ </span>{s.label}</div>
            <div className="ygo-activation-banner-name">
              <span className="ygo-activation-banner-card">{s.name}</span>
              {s.chainLink ? <span className="ygo-activation-banner-cl"> · CL {s.chainLink}</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
