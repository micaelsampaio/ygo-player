import { memo, useMemo } from "react";
import { TimelineCommandProps } from "../../timeline";

export const DuelPhaseCommandTimeline = memo(function ({
  command: baseCommand,
  duel
}: TimelineCommandProps) {

  const command = baseCommand as any;
  const log: any = useMemo(() => duel.ygo.duelLog.logs.find(log => log.commandId === command.commandId) || {}, [command])
  const { turn, turnPlayer, phase } = log;

  return (
    <div className="command-tooltip">
      <div className="ygo-flex ygo-flex-col ygo-gap-1">
        <div>P{turnPlayer + 1}</div>
        <div>
          Turn {turn}
        </div>
        <div><b>{phase}</b></div>
      </div>
    </div>
  );
});
