import { memo } from "react";
import { TimelineCommandProps } from "../../timeline";
//import { MoveCardCommand } from "ygo-core/dist/commands/MoveCardCommand";

export const TooltipCommandWithCardName = memo(function ({
  command: baseCommand,
  duel,
}: TimelineCommandProps) {
  const command = baseCommand as any;
  const card = duel.ygo.state.getCardData(command.data.id);

  return (
    <div className="command-tooltip">
      <div>
        <div>
          <b>{(command as any).type}</b>
        </div>
        <div>{card?.name}</div>
      </div>
    </div>
  );
});
