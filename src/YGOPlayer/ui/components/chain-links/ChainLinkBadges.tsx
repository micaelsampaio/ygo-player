import { type CSSProperties, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { YGODuel } from "../../../core/YGODuel";
import { YGOGameUtils } from "ygo-core";
import { getGameZone, getZonePosition } from "../../../scripts/ygo-utils";
import { ndcToContainer } from "../../field-overlay";
import { ChainBoardView, chainBadgeScale, chainBadges, exitingItems } from "./chain-links";
import { RESOLVE_ALL_LABEL, chainModeOn, resolveLinkLabel, showResolveAll } from "../../../domain/chain-mode";
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

interface Placed {
  key: string; link: number; id: number; player: number; top: boolean; stack: number;
  /** The numeral's anchor: beside the card's lower-left corner (Master Duel). */
  x: number; y: number;
  /** The card's centre: where the chain attaches. */
  cx: number; cy: number;
  scale: number; name: string;
}

/** A badge on its way out, kept drawn until its exit animation ends. */
interface Leaving<T> { item: T; delay: number; until: number; resolved: boolean }

/** Chain mode's floating resolve control: beside the newest badge, or docked when that card is out of view. */
interface ResolveControl { label: string; all: boolean; x: number | null; y: number | null }

/** Where the numeral sits relative to its card's centre, in world units
 * measured on screen (left, down): by the lower-left corner, whichever side
 * of the board the camera looks from. */
const BADGE_OFFSET = { left: 1.05, down: 1.05 };
const WORLD_UNIT_X = new THREE.Vector3(1, 0, 0);
/** Badges sharing a zone step aside by this much (px). */
const STACK_STEP = 22;
/** The exit animations' length (style.css: ygo-chain-link-resolve / ygo-chain-seg-out). */
const EXIT_MS = 520;
/** The gap between links resolving together, newest first. */
const EXIT_STEP_MS = 170;

const same = <T,>(a: T, b: T) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The chain being built, drawn on the field Master Duel style: a big golden
 * numeral beside each card with an effect on the chain (the newest biggest),
 * and a glowing golden chain linking the cards in link order. Server duels
 * fill ygo-core's chain from their rules engine; manual / editor duels in
 * chain mode (domain/chain-mode.ts) fill it by hand, and then a small
 * "Resolve link N" / "Resolve all" control sits beside the newest numeral.
 * A numeral only sits by its card where the board shows it now: once the
 * card has left (to a pile, banished, shuffled back), its number goes. When
 * links resolve they go top-down, each number flashing before it fades. Re-projected a few times a second while a
 * chain is open (the camera or the layout can move). The activated card's
 * own lift / golden rim is the activation handler's (duel-events/utils/chain-fx.ts).
 */
export function ChainLinkBadges({ duel }: { duel: YGODuel }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [leavingBadges, setLeavingBadges] = useState<Leaving<Placed>[]>([]);
  const [control, setControl] = useState<ResolveControl | null>(null);
  const last = useRef<{ placed: Placed[] }>({ placed: [] });

  useEffect(() => {
    const project = (position: THREE.Vector3, canvas: DOMRect, container: DOMRect) =>
      ndcToContainer(position.project(duel.core.camera), canvas, container);

    const place = () => {
      const root = ref.current;
      const chain = duel.ygo?.state?.chain;
      const badges = root ? chainBadges(chain, boardView(duel)) : [];
      const showControl = !!root && chainModeOn(duel) && (chain?.length ?? 0) > 0;
      const topLink = badges.reduce((m, b) => Math.max(m, b.link), 0);

      const next: Placed[] = [];
      if (root && badges.length > 0) {
        const canvas = duel.core.renderer.domElement.getBoundingClientRect();
        const container = root.getBoundingClientRect();
        for (const b of badges) {
          let center: { x: number; y: number } | null = null;
          let unit: { x: number; y: number } | null = null;
          try {
            const zone = getZonePosition(duel, b.zone);
            center = project(zone.clone(), canvas, container);
            unit = project(zone.add(WORLD_UNIT_X), canvas, container);
          } catch {
            center = null; // a zone this board doesn't draw
          }
          if (!center) continue;
          // One world unit in px here (perspective shrinks the far side).
          const px = unit ? Math.hypot(unit.x - center.x, unit.y - center.y) : 24;
          const at = { x: center.x - BADGE_OFFSET.left * px, y: center.y + BADGE_OFFSET.down * px };
          next.push({
            key: `${b.link}:${b.id}`, link: b.link, id: b.id, player: b.player, top: b.top, stack: b.stack,
            x: at.x + b.stack * STACK_STEP, y: at.y - b.stack * STACK_STEP, cx: center.x, cy: center.y,
            scale: chainBadgeScale(b.link, topLink),
            name: duel.ygo.state.getCardData(b.id)?.name ?? "a card",
          });
        }
      }
      // What went since the last pass: resolved links flash and go, newest first.
      const now = Date.now();
      const inChain = (p: Placed) => !!chain?.some((l) => l.link === p.link && l.id === p.id);
      const goneBadges = exitingItems(last.current.placed, next, { stepMs: EXIT_STEP_MS });
      last.current = { placed: next };

      const liveKeys = new Set(next.map((p) => p.key));
      setLeavingBadges((prev) => {
        const kept = prev.filter((l) => l.until > now && !liveKeys.has(l.item.key));
        const added = goneBadges.map(({ item, delay }) => ({ item, delay, until: now + delay + EXIT_MS, resolved: !inChain(item) }));
        return added.length === 0 && kept.length === prev.length ? prev : [...kept, ...added];
      });
      setPlaced((prev) => (same(prev, next) ? prev : next));

      const topBadge = next.find((p) => p.top);
      const nextControl: ResolveControl | null = showControl
        ? { label: resolveLinkLabel(chain), all: showResolveAll(chain), x: topBadge ? topBadge.x + 40 : null, y: topBadge ? topBadge.y : null }
        : null;
      setControl((prev) => (same(prev, nextControl) ? prev : nextControl));
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

  const playerClass = (player: number) => `ygo-player-${duel.perspective.getPlayerCssIndex(player)}`;

  return (
    <div ref={ref} className="ygo-chain-links" aria-live="polite">
      {placed.map((p) => (
        <div
          key={p.key}
          className={`ygo-chain-link-badge ${playerClass(p.player)}${p.top ? " ygo-chain-link-top" : ""}`}
          style={{ left: p.x, top: p.y, "--chain-scale": p.scale } as CSSProperties}
          role="img"
          aria-label={`Chain Link ${p.link}: ${p.name}`}
          title={`Chain Link ${p.link}: ${p.name}`}
        >
          <span className="ygo-chain-link-num">{p.link}</span>
        </div>
      ))}
      {leavingBadges.map((l) => (
        <div
          key={`x:${l.item.key}`}
          className={`ygo-chain-link-badge ${playerClass(l.item.player)} ${l.resolved ? "ygo-chain-link-resolving" : "ygo-chain-link-leaving"}`}
          style={{ left: l.item.x, top: l.item.y, "--chain-scale": l.item.scale, "--chain-exit-delay": `${l.delay}ms` } as CSSProperties}
          aria-hidden="true"
        >
          <span className="ygo-chain-link-num">{l.item.link}</span>
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
          {control.all && <button type="button" className="ygo-chain-resolve-btn" title="Resolve every link, newest first" onClick={() => duel.gameActions.resolveChain()}>
            {RESOLVE_ALL_LABEL}
          </button>}
        </div>
      )}
    </div>
  );
}
