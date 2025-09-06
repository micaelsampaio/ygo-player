import { memo, useMemo } from "react";
import { TimelineCommandProps } from "../../timeline";

export const duelTurnCommandTimeline = memo(function ({
  command: baseCommand,
  duel
}: TimelineCommandProps) {

  const command = baseCommand as any;
  const log: any = useMemo(() => duel.ygo.duelLog.logs.find(log => log.commandId === command.commandId) || {}, [command])
  const { turn, turnPlayer } = log;

  return (
    <div className="command-tooltip">
      <div className="ygo-flex ygo-flex-col ygo-gap-1">
        <div>P{turnPlayer + 1}</div>
        <div>
          <b>Turn {turn}</b>
        </div>
      </div>
    </div>
  );
});
