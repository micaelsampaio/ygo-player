import * as THREE from "three";
import { useCallback, useLayoutEffect, useRef } from "react";
import { YGODuel } from "../../core/YGODuel";
import { getTransformFromCamera, } from "../../scripts/ygo-utils";
import { CardMenu } from "../components/CardMenu";
import { YGODuelPhase } from "ygo-core";

export function DuelPhaseActionsMenu({
  duel,
  transform,
}: {
  duel: YGODuel;
  transform: THREE.Mesh;
}) {
  const menuRef = useRef<HTMLDivElement>();

  const setDuelPhase = useCallback((phase: YGODuelPhase) => {
    duel.gameActions.setDuelPhase({ phase });
  }, [])

  const nextTurn = useCallback(() => {
    duel.gameActions.nextDuelturn();
  }, [])

  useLayoutEffect(() => {
    const container = menuRef.current!;
    const size = container.getBoundingClientRect();
    const { x, y, width } = getTransformFromCamera(duel, transform);
    container.style.top = Math.max(0, y - size.height) + "px";
    container.style.left = x - size.width / 2 + width / 2 + "px";
  }, [transform]);

  const currentTurn = duel.ygo.state.turn;
  const currentDuelPhase = duel.ygo.state.phase;

  return (
    <CardMenu key="global-events-actions-menu" indicator menuRef={menuRef}>
      <button className="ygo-card-item">Next Phase</button>
      <div className="ygo-flex ygo-gap-1">
        <button className={`ygo-card-item ${currentDuelPhase === YGODuelPhase.Draw ? "active" : ""}`} onClick={() => setDuelPhase(YGODuelPhase.Draw)}>D</button>
        <button className={`ygo-card-item ${currentDuelPhase === YGODuelPhase.Standby ? "active" : ""}`} onClick={() => setDuelPhase(YGODuelPhase.Standby)}>SP</button>
        <button className={`ygo-card-item ${currentDuelPhase === YGODuelPhase.Main1 ? "active" : ""}`} onClick={() => setDuelPhase(YGODuelPhase.Main1)}>MP1</button>
      </div>
      <div className="ygo-flex ygo-gap-1">
        <button className={`ygo-card-item ${currentDuelPhase === YGODuelPhase.Battle ? "active" : ""}`} disabled={currentTurn <= 1} onClick={() => setDuelPhase(YGODuelPhase.Battle)}>B</button>
        <button className={`ygo-card-item ${currentDuelPhase === YGODuelPhase.Main2 ? "active" : ""}`} disabled={currentTurn <= 1} onClick={() => setDuelPhase(YGODuelPhase.Main2)}>MP2</button>
        <button className={`ygo-card-item ${currentDuelPhase === YGODuelPhase.End ? "active" : ""}`} onClick={() => setDuelPhase(YGODuelPhase.End)}>E</button>
      </div>
      <button className="ygo-card-item" onClick={nextTurn}>Next Turn</button>
    </CardMenu>
  );
}
function parseTimeToSeconds(input: string): number | null {
  const trimmed = input.trim();

  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  const regex = /^(?:(\d+)m)?\s*(?:(\d+)s)?$/i;
  const match = trimmed.match(regex);

  if (!match) return null;

  const minutes = match[1] ? parseInt(match[1], 10) : 0;
  const seconds = match[2] ? parseInt(match[2], 10) : 0;

  if (minutes === 0 && seconds === 0) return null;

  return minutes * 60 + seconds;
}
