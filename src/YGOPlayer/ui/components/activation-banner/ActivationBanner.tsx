import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { YGODuel } from "../../../core/YGODuel";
import {
  activationBanner,
  activationBannerMs,
  activationTitle,
  bannerTopUnderHud,
  pushActivationBanner,
  type ActivationBannerItem,
} from "./activation-banner";
import "./style.css";

interface Shown extends ActivationBannerItem {
  ms: number;
}

/**
 * Master Duel-style banner for the opponent's activations, top right under their HUD:
 * "▲ Opponent activated a Trap", the card's name and chain link, and its effect text
 * (a few lines). Purely visual: it never holds the duel's
 * animations, and clicks pass through. Up to three stack, newest on top.
 */
export function ActivationBanner({ duel }: { duel: YGODuel }) {
  const [shown, setShown] = useState<Shown[]>([]);
  const nextId = useRef(0);
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState<number | null>(null);

  // Just under the opponent's HUD, measured whenever a banner shows (its size depends on the layout).
  useLayoutEffect(() => {
    if (shown.length === 0) return;
    const el = ref.current;
    const hud = el?.closest(".ygo-player-core")?.querySelector(".ygo-player-hud.ygo-player-1");
    setTop(bannerTopUnderHud(hud?.getBoundingClientRect(), (el?.offsetParent ?? el?.parentElement)?.getBoundingClientRect()));
  }, [shown.length]);

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
    <div ref={ref} className="ygo-activation-banners" role="status" aria-live="polite" style={top !== null ? { top } : undefined}>
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
            {s.text && <div className="ygo-activation-banner-text">{s.text}</div>}
          </div>
        );
      })}
    </div>
  );
}
