import * as THREE from "three";
import { useAnchoredMenu } from "../components/use-anchored-menu";
import { useCallback, useEffect, useRef, useState } from "react";
import { YGODuel } from "../../core/YGODuel";
import { CardMenu } from "../components/CardMenu";
import { YGODuelPhase } from "ygo-core";
import { endTurn, goToNextPhase, goToPhase } from "../../domain/phase-navigation";
import { PhaseName, phaseButtonState } from "./phase-buttons";
import { RESOLVE_ALL_LABEL, chainModeOn, currentChain, resolveLinkLabel, showResolveAll } from "../../domain/chain-mode";

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

  const [transitioning, setTransitioning] = useState(false);

  // Locks the buttons while a jump steps through the phases in between.
  const run = useCallback((step: Promise<void>) => {
    setTransitioning(true);
    step.finally(() => { if (isMountedRef.current) setTransitioning(false); });
  }, []);

  const nextPhase = useCallback(() => goToNextPhase(duel), [duel]);
  const nextTurn = useCallback(() => run(endTurn(duel)), [duel, run]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    }
  }, [])

  useAnchoredMenu(duel, menuRef, () => ({ kind: "object3d", object: transform }), [transform]);

  const currentTurn = duel.ygo.state.turn;
  const currentDuelPhase = duel.ygo.state.phase;
  // Chain mode: the open chain resolves from here too (phase changes resolve it first).
  const chain = chainModeOn(duel) ? currentChain(duel) : [];

  const phaseButton = (phase: YGODuelPhase) => {
    const state = phaseButtonState(phase as PhaseName, { currentPhase: currentDuelPhase, turn: currentTurn, transitioning });
    return <button
      key={phase}
      type="button"
      className={`ygo-card-item ${state.active ? "active" : ""}`}
      disabled={state.disabled}
      title={state.title}
      aria-label={state.title}
      aria-current={state.active ? "step" : undefined}
      onClick={() => run(goToPhase(duel, phase))}
    >
      {state.label}
    </button>
  };

  return (
    <CardMenu key="global-events-actions-menu" menuRef={menuRef}>
      <button type="button" className="ygo-card-item" onClick={nextPhase} title="Go to the next phase">Next Phase</button>
      <div className="ygo-phase-grid">
        {phaseButton(YGODuelPhase.Draw)}
        {phaseButton(YGODuelPhase.Standby)}
        {phaseButton(YGODuelPhase.Main1)}
      </div>
      <div className="ygo-phase-grid">
        {phaseButton(YGODuelPhase.Battle)}
        {phaseButton(YGODuelPhase.Main2)}
        {phaseButton(YGODuelPhase.End)}
      </div>
      {chain.length === 1 && <button type="button" className="ygo-card-item" onClick={() => duel.gameActions.resolveChainLink()} title="Resolve the chain">
        {resolveLinkLabel(chain)}
      </button>}
      {showResolveAll(chain) && <div className="ygo-phase-grid ygo-chain-resolve-grid">
        <button type="button" className="ygo-card-item" onClick={() => duel.gameActions.resolveChainLink()} title="Resolve the newest chain link">
          {resolveLinkLabel(chain)}
        </button>
        <button type="button" className="ygo-card-item" onClick={() => duel.gameActions.resolveChain()} title="Resolve every link, newest first">
          {RESOLVE_ALL_LABEL}
        </button>
      </div>}
      <button type="button" className="ygo-card-item" onClick={nextTurn} title="End your turn and pass to your opponent">End Turn</button>
    </CardMenu>
  );
}
