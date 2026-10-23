import { YGODuelEvents, YGODuelPhase } from "ygo-core";
import type { SfxName } from "./battle-sfx";

/** The slice of YGODuel the battle sound hooks need (kept narrow so tests can fake it). */
export interface BattleSfxDuel {
  ygo: {
    events: {
      on(event: "new-log", cb: (log: YGODuelEvents.DuelLog) => void): unknown;
      on(event: "set-duel-phase", cb: (data: { phase: YGODuelPhase }) => void): unknown;
    };
  };
  events: {
    on(event: "battle-impact", cb: (args: { player: number; direct?: boolean }) => void): unknown;
  };
  commands: { isRecovering(): boolean };
  soundController: { playSfx(name: SfxName): boolean };
}

/** Phases that pass on their own at the start of a turn: no chime, it would stack with the turn change. */
const SILENT_PHASES = new Set<YGODuelPhase>([YGODuelPhase.Draw, YGODuelPhase.Standby]);

/**
 * Plays the synthesized battle effects off existing duel events:
 * - Attack / Attack Directly log → "attack-swing" (and remembers which kind it was),
 * - "battle-impact" → "attack-hit", or "attack-hit-heavy" for a direct attack,
 * - "set-duel-phase" → "phase-battle" on the Battle Phase, a soft "phase" on Main 1/2 and End.
 * Nothing plays while the commands controller is recovering (replay goto / undo / reconnect).
 */
export function bindBattleSfx(duel: BattleSfxDuel) {
  // Attack kinds in log order, consumed by the impacts (which follow in the same order).
  const pendingDirect: boolean[] = [];
  const muted = () => duel.commands.isRecovering();

  duel.ygo.events.on("new-log", (log) => {
    if (log?.type !== YGODuelEvents.LogType.Attack && log?.type !== YGODuelEvents.LogType.AttackDirectly) return;
    if (muted()) {
      pendingDirect.length = 0;
      return;
    }
    pendingDirect.push(log.type === YGODuelEvents.LogType.AttackDirectly);
    if (pendingDirect.length > 8) pendingDirect.shift();
    duel.soundController.playSfx("attack-swing");
  });

  duel.events.on("battle-impact", (args) => {
    const queued = pendingDirect.shift();
    if (muted()) return;
    const direct = typeof args?.direct === "boolean" ? args.direct : !!queued;
    duel.soundController.playSfx(direct ? "attack-hit-heavy" : "attack-hit");
  });

  duel.ygo.events.on("set-duel-phase", ({ phase }) => {
    if (muted() || SILENT_PHASES.has(phase)) return;
    duel.soundController.playSfx(phase === YGODuelPhase.Battle ? "phase-battle" : "phase");
  });
}
