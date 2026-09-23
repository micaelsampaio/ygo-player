import * as THREE from "three";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { YGODuel } from "../../core/YGODuel";
import { getTransformFromCamera, } from "../../scripts/ygo-utils";
import { CardMenu } from "../components/CardMenu";
import { YGODuelPhase, YGO_DUEL_PHASE_ORDER } from "ygo-core";

export function DuelPhaseActionsMenu({
  duel,
  transform,
}: {
  duel: YGODuel;
  transform: THREE.Mesh;
}) {
  const menuRef = useRef<HTMLDivElement>();
  // Every executed command (including "Duel Phase"/"Duel Turn") round-trips
  // through YGOCommandsController.processYGOLog, which dispatches
  // "disable-game-actions" then "enable-game-actions" around it — and
  // YGOUiController unmounts/remounts this very component in between (see
  // `gameConfig.actions` gating `<Action>`). A component-scoped timer ref
  // (cleared on unmount) would lose every step after the first as soon as
  // that first step's own command triggers the blip — so goToPhase's
  // multi-step sequencing below deliberately uses plain setTimeout instead.
  const isMountedRef = useRef(true);

  const setDuelPhase = useCallback((phase: YGODuelPhase) => {
    duel.gameActions.setDuelPhase({ phase });
  }, [])

  const [transitioning, setTransitioning] = useState(false);

  const goToPhase = useCallback((target: YGODuelPhase, onComplete?: () => void) => {
    const currentPhase = duel.ygo.state.phase;
    const currentTurn = duel.ygo.state.turn;

    const currentIndex = YGO_DUEL_PHASE_ORDER.indexOf(currentPhase);
    const targetIndex = YGO_DUEL_PHASE_ORDER.indexOf(target);

    if (targetIndex <= currentIndex) {
      // allow direct set when target is same or before (buttons before are usually disabled)
      duel.gameActions.setDuelPhase({ phase: target });
      onComplete?.();
      return;
    }

    // build sequential steps from current to target, honoring phase-skip rules
    const steps: YGODuelPhase[] = [];
    const battleIndex = YGO_DUEL_PHASE_ORDER.indexOf(YGODuelPhase.Battle);
    let idx = currentIndex;
    while (idx < targetIndex) {
      let nextIdx = idx + 1;
      let nextPhase = YGO_DUEL_PHASE_ORDER[nextIdx];

      // Draw's only next phase is Standby, and Standby's only next phase is
      // Main1 — neither is ever skippable, but that doesn't mean `target`
      // (the ultimate destination, which may be several phases further,
      // e.g. goToPhase(End) from Draw) has to equal that immediate next
      // step. It previously did (`if (target !== Standby) return`), which
      // silently aborted any multi-hop call starting from Draw/Standby —
      // Standby/Main1 are already correctly queued as the next step below
      // regardless, so there's nothing to guard here.

      // From Main1: skip Battle and Main2 when turn is 1, or when the target
      // is End Phase (player is leaving main phase without entering battle).
      // Main2 is not reachable from Main1 — it requires Battle first.
      if (YGO_DUEL_PHASE_ORDER[idx] === YGODuelPhase.Main1) {
        if (target === YGODuelPhase.Main2) return; // illegal jump
        if (currentTurn === 1 || targetIndex > battleIndex) {
          nextIdx = targetIndex;
          nextPhase = YGO_DUEL_PHASE_ORDER[nextIdx];
        }
      }


      if (!nextPhase) break;
      steps.push(nextPhase);
      idx = nextIdx;
    }

    if (steps.length === 0) {
      onComplete?.();
      return;
    }

    setTransitioning(true);
    // sequence the phase changes with small delays so any phase-entry effects run in order
    steps.forEach((phase, i) => {
      setTimeout(() => duel.gameActions.setDuelPhase({ phase }), i * 120);
    });

    // clear transitioning after last step
    const total = steps.length * 120 + 50;
    setTimeout(() => {
      if (isMountedRef.current) setTransitioning(false);
      onComplete?.();
    }, total);
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
    // Jumping straight to nextDuelturn() from an earlier phase only updates
    // ygo-core's own turn/phase state — the mirrored "Duel Turn"/"Duel
    // Phase" pushes never drive ocgcore's real engine through the current
    // phase's actual transition (IDLE_TO_BP/BATTLE_TO_M2/IDLE_TO_EP/
    // BATTLE_TO_EP — see do_push in judge.cpp), so ocgcore silently falls
    // behind ygo-core. In a bot-duel room this means the bot's turn gets
    // triggered but ocgcore still thinks it's the human's turn, so the bot
    // immediately hands back without ever playing — with nothing visibly
    // wrong on screen. Walk to End Phase first (mirroring each real
    // transition) so both engines are actually in sync before flipping.
    goToPhase(YGODuelPhase.End, () => {
      duel.gameActions.nextDuelturn();
      duel.gameActions.setDuelPhase({ phase: YGODuelPhase.Draw });
    });
  }, [goToPhase])

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    }
  }, [])

  useLayoutEffect(() => {
    const container = menuRef.current!;
    const size = container.getBoundingClientRect();
    const { x, y, width } = getTransformFromCamera(duel, transform);

    const top = Math.max(0, y - size.height);
    const left = x - size.width / 2 + width / 2;

    const clampedTop = Math.min(top, window.innerHeight - size.height);
    const clampedLeft = Math.max(0, Math.min(left, window.innerWidth - size.width));

    container.style.top = clampedTop + "px";
    container.style.left = clampedLeft + "px";
  }, [transform]);

  const currentTurn = duel.ygo.state.turn;
  const currentDuelPhase = duel.ygo.state.phase;

  const phaseIndex = (p: YGODuelPhase) => YGO_DUEL_PHASE_ORDER.indexOf(p);
  const isBefore = (a: YGODuelPhase, b: YGODuelPhase) => phaseIndex(a) < phaseIndex(b);

  return (
    <CardMenu key="global-events-actions-menu" menuRef={menuRef}>
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
          disabled={transitioning || isBefore(YGODuelPhase.Standby, currentDuelPhase) || currentDuelPhase !== YGODuelPhase.Draw}
          onClick={() => goToPhase(YGODuelPhase.Standby)}
        >
          SP
        </button>
        <button
          className={`ygo-card-item ${currentDuelPhase === YGODuelPhase.Main1 ? "active" : ""}`}
          disabled={transitioning || isBefore(YGODuelPhase.Main1, currentDuelPhase) || currentDuelPhase !== YGODuelPhase.Standby}
          onClick={() => goToPhase(YGODuelPhase.Main1)}
        >
          MP1
        </button>
      </div>
      <div className="ygo-flex ygo-gap-1">
        <button
          className={`ygo-card-item ${currentDuelPhase === YGODuelPhase.Battle ? "active" : ""}`}
          disabled={transitioning || currentTurn <= 1 || isBefore(YGODuelPhase.Battle, currentDuelPhase) || currentDuelPhase !== YGODuelPhase.Main1}
          onClick={() => goToPhase(YGODuelPhase.Battle)}
        >
          B
        </button>
        <button
          className={`ygo-card-item ${currentDuelPhase === YGODuelPhase.Main2 ? "active" : ""}`}
          disabled={transitioning || currentTurn <= 1 || isBefore(YGODuelPhase.Main2, currentDuelPhase) || isBefore(currentDuelPhase, YGODuelPhase.Battle)}
          onClick={() => goToPhase(YGODuelPhase.Main2)}
        >
          MP2
        </button>
        <button
          className={`ygo-card-item ${currentDuelPhase === YGODuelPhase.End ? "active" : ""}`}
          disabled={transitioning || isBefore(YGODuelPhase.End, currentDuelPhase) || isBefore(currentDuelPhase, YGODuelPhase.Main1)}
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
