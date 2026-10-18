import { memo, useMemo } from "react";
import type { YGODuelEvents } from "ygo-core";
import type { TimelineCommandProps } from "../types";

export const DuelPhaseCommandTimeline = memo(function ({
  command,
  duel
}: TimelineCommandProps) {

  // The command's own log; a command of this type logs a DuelPhase entry.
  const log = useMemo(() => (duel.ygo.duelLog.logs.find(log => log.commandId === command.commandId) as Partial<YGODuelEvents.DuelPhase> | undefined) ?? {}, [command])
  const { turn, turnPlayer, phase } = log;

  return (
    <div className="command-tooltip">
      <div className="ygo-flex ygo-flex-col ygo-gap-1">
        <div>P{Number(turnPlayer) + 1}</div>
        <div>
          Turn {turn}
        </div>
        <div><b>{phase}</b></div>
      </div>
    </div>
  );
});
