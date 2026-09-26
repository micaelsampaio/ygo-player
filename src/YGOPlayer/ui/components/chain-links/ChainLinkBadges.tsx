import { useEffect, useRef, useState } from "react";
import { YGODuel } from "../../../core/YGODuel";
import { YGOStatic } from "../../../core/YGOStatic";
import { getZonePosition } from "../../../scripts/ygo-utils";
import { ndcToContainer } from "../../field-overlay";
import { chainBadges } from "./chain-links";
import "./style.css";

interface Placed { key: string; link: number; player: number; top: boolean; stack: number; x: number; y: number; name: string }

/**
 * The chain being built, drawn on the field: a numbered badge on each card
 * with an effect on the chain (Master Duel style), the newest one marked.
 * Only server duels fill ygo-core's chain (their rules engine knows it);
 * elsewhere this draws nothing. Re-projected a few times a second while a
 * chain is open (the camera or the layout can move).
 */
export function ChainLinkBadges({ duel }: { duel: YGODuel }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [placed, setPlaced] = useState<Placed[]>([]);

  useEffect(() => {
    const place = () => {
      const root = ref.current;
      const chain = (duel.ygo?.state as any)?.chain;
      const badges = chainBadges(chain);
      if (!root || badges.length === 0) {
        setPlaced((prev) => (prev.length ? [] : prev));
        return;
      }
      const canvas = duel.core.renderer.domElement.getBoundingClientRect();
      const container = root.getBoundingClientRect();
      const next: Placed[] = [];
      for (const b of badges) {
        let point: { x: number; y: number } | null = null;
        try {
          point = ndcToContainer(getZonePosition(duel, b.zone).project(duel.core.camera), canvas, container);
        } catch {
          point = null; // a zone this board doesn't draw
        }
        if (!point) continue;
        next.push({
          key: `${b.link}:${b.id}`, link: b.link, player: b.player, top: b.top, stack: b.stack, x: point.x, y: point.y,
          name: duel.ygo.state.getCardData(b.id)?.name ?? "a card",
        });
      }
      setPlaced((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    place();
    const onChange = () => place();
    duel.events.on("logs-updated", onChange);
    duel.events.on("render-ui", onChange);
    const timer = setInterval(place, 200);
    return () => {
      clearInterval(timer);
      duel.events.off("logs-updated", onChange);
      duel.events.off("render-ui", onChange);
    };
  }, [duel]);

  return (
    <div ref={ref} className="ygo-chain-links" aria-live="polite">
      {placed.map((p) => (
        <div
          key={p.key}
          className={`ygo-chain-link-badge ygo-player-${YGOStatic.getPlayerCssIndex(p.player)}${p.top ? " ygo-chain-link-top" : ""}`}
          style={{ left: p.x + p.stack * 18, top: p.y - p.stack * 18 }}
          role="img"
          aria-label={`Chain Link ${p.link}: ${p.name}`}
          title={`Chain Link ${p.link}: ${p.name}`}
        >
          {p.link}
        </div>
      ))}
    </div>
  );
}
