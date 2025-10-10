import * as THREE from "three";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { YGODuel } from "../../core/YGODuel";
import { getTransformFromCamera, } from "../../scripts/ygo-utils";
import { CardMenu } from "../components/CardMenu";
import { YGODuelPhase, YGO_DUEL_PHASE_ORDER } from "ygo-core";
import { YGOTimerUtils } from "../../scripts/timer-utils";

export function DuelPhaseActionsMenu({
  duel,
  transform,
}: {
  duel: YGODuel;
  transform: THREE.Mesh;
}) {
  const menuRef = useRef<HTMLDivElement>();
  const timers = useRef<YGOTimerUtils>(new YGOTimerUtils())

  const setDuelPhase = useCallback((phase: YGODuelPhase) => {
    duel.gameActions.setDuelPhase({ phase });
  }, [])

  const [transitioning, setTransitioning] = useState(false);

  const goToPhase = useCallback((target: YGODuelPhase) => {
    const currentPhase = duel.ygo.state.phase;
    const currentTurn = duel.ygo.state.turn;

    const currentIndex = YGO_DUEL_PHASE_ORDER.indexOf(currentPhase);
    const targetIndex = YGO_DUEL_PHASE_ORDER.indexOf(target);

    if (targetIndex <= currentIndex) {
      // allow direct set when target is same or before (buttons before are usually disabled)
      duel.gameActions.setDuelPhase({ phase: target });
      return;
    }

    // build sequential steps from current to target, honoring turn-1 skip rule
    const steps: YGODuelPhase[] = [];
    let idx = currentIndex;
    while (idx < targetIndex) {
      let nextIdx = idx + 1;
      let nextPhase = YGO_DUEL_PHASE_ORDER[nextIdx];

      // if we are at Main1 on turn 1, skip Battle and Main2
      if (
        currentTurn === 1 &&
        YGO_DUEL_PHASE_ORDER[idx] === YGODuelPhase.Main1
      ) {
        nextIdx += 2; // skip Battle and Main2
        nextPhase = YGO_DUEL_PHASE_ORDER[nextIdx];
      }

      if (!nextPhase) break;
      steps.push(nextPhase);
      idx = nextIdx;
    }

    if (steps.length === 0) return;

    setTransitioning(true);
    // sequence the phase changes with small delays so any phase-entry effects run in order
    steps.forEach((phase, i) => {
      timers.current.setTimeout(() => duel.gameActions.setDuelPhase({ phase }), i * 120);
    });

    // clear transitioning after last step
    const total = steps.length * 120 + 50;
    timers.current.setTimeout(() => setTransitioning(false), total);
  }, [duel]);

  const nextPhase = useCallback(() => {
    const currentPhase = duel.ygo.state.phase;
    const currentTurn = duel.ygo.state.turn;
    let nextPhaseIndex = YGO_DUEL_PHASE_ORDER.indexOf(currentPhase) + 1;
    let nextPhase = YGO_DUEL_PHASE_ORDER[nextPhaseIndex];

    if (
      currentTurn === 1 &&
      currentPhase === YGODuelPhase.Main1
    ) {
      // turn 1 skip battle and main2
      nextPhaseIndex += 2;
      nextPhase = YGO_DUEL_PHASE_ORDER[nextPhaseIndex];
    }

    if (nextPhase) {
      duel.gameActions.setDuelPhase({ phase: nextPhase });
    }
  }, [duel]);

  const nextTurn = useCallback(() => {
    // advance to next duel turn and move to the first phase (Draw)
    duel.gameActions.nextDuelturn();
    duel.gameActions.setDuelPhase({ phase: YGODuelPhase.Draw });
  }, [])

  useEffect(() => {
    return () => {
      timers.current?.clear();
    }
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

  const phaseIndex = (p: YGODuelPhase) => YGO_DUEL_PHASE_ORDER.indexOf(p);
  const isBefore = (a: YGODuelPhase, b: YGODuelPhase) => phaseIndex(a) < phaseIndex(b);

  return (
    <CardMenu key="global-events-actions-menu" indicator menuRef={menuRef}>
      <button className="ygo-card-item" onClick={nextPhase}>Next Phase</button>
      <div className="ygo-flex ygo-gap-1">
        <button
          className={`ygo-card-item ${currentDuelPhase === YGODuelPhase.Draw ? "active" : ""}`}
          disabled={transitioning || isBefore(YGODuelPhase.Draw, currentDuelPhase)}
          onClick={() => goToPhase(YGODuelPhase.Draw)}
        >
          D
        </button>
        <button
          className={`ygo-card-item ${currentDuelPhase === YGODuelPhase.Standby ? "active" : ""}`}
          disabled={transitioning || isBefore(YGODuelPhase.Standby, currentDuelPhase)}
          onClick={() => goToPhase(YGODuelPhase.Standby)}
        >
          SP
        </button>
        <button
          className={`ygo-card-item ${currentDuelPhase === YGODuelPhase.Main1 ? "active" : ""}`}
          disabled={transitioning || isBefore(YGODuelPhase.Main1, currentDuelPhase)}
          onClick={() => goToPhase(YGODuelPhase.Main1)}
        >
          MP1
        </button>
      </div>
      <div className="ygo-flex ygo-gap-1">
        <button
          className={`ygo-card-item ${currentDuelPhase === YGODuelPhase.Battle ? "active" : ""}`}
          disabled={transitioning || currentTurn <= 1 || isBefore(YGODuelPhase.Battle, currentDuelPhase)}
          onClick={() => goToPhase(YGODuelPhase.Battle)}
        >
          B
        </button>
        <button
          className={`ygo-card-item ${currentDuelPhase === YGODuelPhase.Main2 ? "active" : ""}`}
          disabled={transitioning || currentTurn <= 1 || isBefore(YGODuelPhase.Main2, currentDuelPhase)}
          onClick={() => goToPhase(YGODuelPhase.Main2)}
        >
          MP2
        </button>
        <button
          className={`ygo-card-item ${currentDuelPhase === YGODuelPhase.End ? "active" : ""}`}
          disabled={transitioning || isBefore(YGODuelPhase.End, currentDuelPhase)}
          onClick={() => goToPhase(YGODuelPhase.End)}
        >
          E
        </button>
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
