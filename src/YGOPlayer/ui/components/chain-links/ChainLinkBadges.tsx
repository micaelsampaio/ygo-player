import { useEffect, useRef, useState } from "react";
import { YGODuel } from "../../../core/YGODuel";
import { YGOGameUtils } from "ygo-core";
import { getGameZone, getZonePosition } from "../../../scripts/ygo-utils";
import { ndcToContainer } from "../../field-overlay";
import { ChainBoardView, chainBadges } from "./chain-links";
import { RESOLVE_ALL_LABEL, chainModeOn, resolveLinkLabel } from "../../../domain/chain-mode";
import { stopPropagationCallback } from "../../../scripts/utils";
import "./style.css";

/** The board as drawn: field slots and the hand from the scene objects (they
 * lag ygo-core's state until each move has animated), piles from the state
 * (their cards have no object of their own). */
function boardView(duel: YGODuel): ChainBoardView {
  return {
    fieldCardId: (zone) => getGameZone(duel, YGOGameUtils.getZoneData(zone))?.getCardReference()?.id,
    handIds: (player) => duel.fields[player]?.hand.cards.map((c) => c.card.id) ?? [],
    pileIds: (player, pile) => {
      const field = duel.ygo.state.fields[player];
      return (pile === "GY" ? field?.graveyard : field?.banishedZone)?.map((c) => c.id) ?? [];
    },
  };
}

interface Placed { key: string; link: number; player: number; top: boolean; stack: number; x: number; y: number; name: string }

/** Chain mode's floating resolve control: beside the newest badge, or docked when that card is out of view. */
interface ResolveControl { label: string; x: number | null; y: number | null }

/**
 * The chain being built, drawn on the field: a numbered badge on each card
 * with an effect on the chain (Master Duel style), the newest one marked.
 * Server duels fill ygo-core's chain from their rules engine; manual /
 * editor duels in chain mode (domain/chain-mode.ts) fill it by hand, and
 * then a small "Resolve link N" / "Resolve all" control sits beside the
 * newest badge. A badge only sits on its card where the
 * board shows it now: once the card has left (to a pile, banished, shuffled
 * back), its number goes. Re-projected a few times a second while a
 * chain is open (the camera or the layout can move).
 */
export function ChainLinkBadges({ duel }: { duel: YGODuel }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [control, setControl] = useState<ResolveControl | null>(null);

  useEffect(() => {
    const place = () => {
      const root = ref.current;
      const chain = (duel.ygo?.state as any)?.chain;
      const badges = chainBadges(chain, boardView(duel));
      const showControl = !!root && chainModeOn(duel) && (chain?.length ?? 0) > 0;
      if (!root || badges.length === 0) {
        setPlaced((prev) => (prev.length ? [] : prev));
        const docked: ResolveControl | null = showControl ? { label: resolveLinkLabel(chain), x: null, y: null } : null;
        setControl((prev) => (JSON.stringify(prev) === JSON.stringify(docked) ? prev : docked));
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
      const top = next.find((p) => p.top);
      const nextControl: ResolveControl | null = showControl
        ? { label: resolveLinkLabel(chain), x: top ? top.x + top.stack * 18 + 24 : null, y: top ? top.y - top.stack * 18 : null }
        : null;
      setControl((prev) => (JSON.stringify(prev) === JSON.stringify(nextControl) ? prev : nextControl));
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
          className={`ygo-chain-link-badge ygo-player-${duel.perspective.getPlayerCssIndex(p.player)}${p.top ? " ygo-chain-link-top" : ""}`}
          style={{ left: p.x + p.stack * 18, top: p.y - p.stack * 18 }}
          role="img"
          aria-label={`Chain Link ${p.link}: ${p.name}`}
          title={`Chain Link ${p.link}: ${p.name}`}
        >
          {p.link}
        </div>
      ))}
      {control && (
        <div
          className={`ygo-chain-resolve-floating${control.x === null ? " ygo-chain-resolve-docked" : ""}`}
          style={control.x === null ? undefined : { left: control.x, top: control.y! }}
          role="group"
          aria-label="Resolve the chain"
          onMouseDown={stopPropagationCallback}
          onMouseUp={stopPropagationCallback}
          onMouseMove={stopPropagationCallback}
          onClick={stopPropagationCallback}
        >
          <button type="button" className="ygo-chain-resolve-btn" title="Resolve the newest chain link" onClick={() => duel.gameActions.resolveChainLink()}>
            {control.label}
          </button>
          <button type="button" className="ygo-chain-resolve-btn" title="Resolve every link, newest first" onClick={() => duel.gameActions.resolveChain()}>
            {RESOLVE_ALL_LABEL}
          </button>
        </div>
      )}
    </div>
  );
}
