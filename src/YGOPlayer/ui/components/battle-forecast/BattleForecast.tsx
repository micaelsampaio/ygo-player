import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { YGOGameUtils, type Card, type FieldZone } from "ygo-core";
import type { YGODuel } from "../../../core/YGODuel";
import type { YGOAttackAimEvent } from "../../../core/YGODuelUIEvents";
import { getGameZone } from "../../../scripts/ygo-utils";
import { ndcToContainer } from "../../field-overlay";
import {
  forecastBattle,
  forecastDamageLabel,
  forecastOutcomeLabel,
  targetStatLabel,
  type ForecastOutcome,
  type ForecastTarget,
} from "../../../domain/battle-forecast";
import "./style.css";

interface Shown {
  x: number;
  y: number;
  direct: boolean;
  attackerAtk: number;
  /** The attacker's side, for its accent color. */
  attackerCss: number;
  target: { label: string; value: string } | null;
  outcome: ForecastOutcome;
  outcomeLabel: string;
  damage: string;
  /** The damaged player is the viewer. */
  damageToViewer: boolean;
}

function cardAt(duel: YGODuel, zone: string): Card | null {
  try {
    return getGameZone(duel, YGOGameUtils.getZoneData(zone as FieldZone))?.getCardReference() ?? null;
  } catch {
    return null;
  }
}

function asTarget(card: Card): ForecastTarget {
  const link = YGOGameUtils.isLinkMonster(card);
  return {
    atk: card.currentAtk ?? card.atk ?? 0,
    def: link ? 0 : (card.currentDef ?? card.def ?? 0),
    defense: !link && YGOGameUtils.isDefense(card),
    faceDown: YGOGameUtils.isFaceDown(card),
  };
}

function compute(duel: YGODuel, aim: YGOAttackAimEvent, root: HTMLElement): Shown | null {
  const attacker = cardAt(duel, aim.attackerZone);
  if (!attacker) return null;
  const targetCard = aim.direct || !aim.targetZone ? null : cardAt(duel, aim.targetZone);
  if (!aim.direct && !targetCard) return null;
  const target = targetCard ? asTarget(targetCard) : null;
  const attackerAtk = attacker.currentAtk ?? attacker.atk ?? 0;
  const forecast = forecastBattle(attackerAtk, target, aim.player);
  const canvas = duel.core.renderer.domElement.getBoundingClientRect();
  const container = root.getBoundingClientRect();
  const { x, y, z } = aim.position;
  const point = ndcToContainer(new THREE.Vector3(x, y, z).project(duel.core.camera), canvas, container);
  if (!point) return null;
  const isViewer = (p: number) => duel.perspective.isPlayerPOV(p);
  return {
    x: point.x,
    y: point.y,
    direct: aim.direct,
    attackerAtk: Math.max(0, attackerAtk),
    attackerCss: duel.perspective.getPlayerCssIndex(aim.player),
    target: target ? targetStatLabel(target) : null,
    outcome: forecast.outcome,
    outcomeLabel: forecastOutcomeLabel(forecast.outcome),
    damage: forecastDamageLabel(forecast, isViewer),
    damageToViewer: forecast.damagedPlayer !== null && isViewer(forecast.damagedPlayer),
  };
}

/**
 * Master Duel-style battle forecast: while an attack is aimed (the arrow
 * snapped onto a monster or the opponent's side), a small panel by the
 * target shows ATK vs its ATK/DEF, what would be destroyed and who takes
 * how much damage. Driven by the "attack-aim" event (ActionAttackSelection).
 */
export function BattleForecast({ duel }: { duel: YGODuel }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    let aim: YGOAttackAimEvent | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    const place = () => {
      const next = aim && ref.current ? compute(duel, aim, ref.current) : null;
      setShown((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    duel.events.on("attack-aim", (next) => {
      aim = next;
      place();
      if (aim && !timer) timer = setInterval(place, 200); // the camera or the stats can change
      if (!aim && timer) { clearInterval(timer); timer = null; }
    }, { signal: abort.signal });
    return () => {
      abort.abort();
      if (timer) clearInterval(timer);
    };
  }, [duel]);

  return (
    <div ref={ref} className="ygo-battle-forecast-layer" aria-live="polite">
      {shown && (
        <div
          className={`ygo-battle-forecast ygo-battle-forecast-${shown.outcome}${shown.direct ? " ygo-battle-forecast-below" : ""}`}
          style={{ left: shown.x, top: shown.y }}
          role="status"
        >
          <div className="ygo-battle-forecast-stats">
            <span className={`ygo-battle-forecast-stat ygo-player-${shown.attackerCss}`}>
              <small>ATK</small>{shown.attackerAtk}
            </span>
            <span className="ygo-battle-forecast-vs">VS</span>
            {shown.target ? (
              <span className={`ygo-battle-forecast-stat ygo-player-${1 - shown.attackerCss}`}>
                <small>{shown.target.label}</small>{shown.target.value}
              </span>
            ) : (
              <span className={`ygo-battle-forecast-stat ygo-player-${1 - shown.attackerCss}`}><small>LP</small>Direct</span>
            )}
          </div>
          <div className="ygo-battle-forecast-outcome">{shown.outcomeLabel}</div>
          {shown.damage && (
            <div className={`ygo-battle-forecast-damage${shown.damageToViewer ? " ygo-battle-forecast-damage-you" : ""}`}>{shown.damage}</div>
          )}
        </div>
      )}
    </div>
  );
}
