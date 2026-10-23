import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { YGODuel } from "../../../core/YGODuel";
import { ndcToContainer } from "../../field-overlay";

/** How long a damage number stays up (its CSS animation is the same length). */
export const DAMAGE_NUMBER_MS = 1300;
/** An LP change this soon after a hit on that player is that hit's damage (shown where it struck). */
const IMPACT_WINDOW_MS = 2500;

interface Shown { id: number; text: string; heal: boolean; x: number; y: number }

/** "-1200" for damage, "+500" for a gain, "" for no change. */
export function damageText(previous: number, next: number): string {
  const delta = next - previous;
  if (!delta) return "";
  return delta > 0 ? `+${delta}` : `${delta}`;
}

/**
 * Master Duel-style floating numbers: each LP change pops a big number on the board, over the
 * monster or player an attack just hit, else over that player's side of the field, then rises
 * and fades.
 */
export function DamageNumbers({ duel }: { duel: YGODuel }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState<Shown[]>([]);
  const lastImpact = useRef<{ position: THREE.Vector3; player: number; at: number } | null>(null);
  const nextId = useRef(0);

  useEffect(() => {
    const abort = new AbortController();
    const timers = new Set<ReturnType<typeof setTimeout>>();

    duel.events.on("battle-impact", ({ position, player }) => {
      lastImpact.current = { position: new THREE.Vector3(position.x, position.y, position.z), player, at: Date.now() };
    }, { signal: abort.signal });

    duel.events.on("duel-update-player-life-points", ({ player, previousLifePoints, lifePoints }) => {
      const text = damageText(previousLifePoints, lifePoints);
      const root = ref.current;
      if (!text || !root) return;
      const container = root.getBoundingClientRect();
      const canvas = duel.core.renderer.domElement.getBoundingClientRect();
      const impact = lastImpact.current;
      let point: { x: number; y: number } | null = null;
      if (impact && impact.player === player && Date.now() - impact.at < IMPACT_WINDOW_MS) {
        point = ndcToContainer(impact.position.clone().project(duel.core.camera), canvas, container);
        lastImpact.current = null;
      }
      if (!point) {
        // No hit to anchor it: the middle of that player's half of the field.
        const bottom = duel.perspective.getPlayerCssIndex(player) === 0;
        point = { x: canvas.left - container.left + canvas.width / 2, y: canvas.top - container.top + canvas.height * (bottom ? 0.68 : 0.3) };
      }
      const id = nextId.current++;
      setShown((list) => [...list, { id, text, heal: lifePoints > previousLifePoints, x: point!.x, y: point!.y }]);
      const timer = setTimeout(() => {
        timers.delete(timer);
        setShown((list) => list.filter((s) => s.id !== id));
      }, DAMAGE_NUMBER_MS);
      timers.add(timer);
    }, { signal: abort.signal });

    return () => {
      abort.abort();
      timers.forEach(clearTimeout);
      // A new duel in the same root: numbers still up would never get their removal timer.
      setShown([]);
      lastImpact.current = null;
    };
  }, [duel]);

  return (
    <div ref={ref} className="ygo-damage-numbers" aria-hidden="true">
      {shown.map((s) => (
        <span key={s.id} className={`ygo-damage-number${s.heal ? " ygo-damage-heal" : ""}`} style={{ left: s.x, top: s.y }}>{s.text}</span>
      ))}
    </div>
  );
}
