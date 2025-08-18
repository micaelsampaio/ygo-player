import { memo } from "react";
import { TimelineCommandProps } from "../../timeline";
//import { MoveCardCommand } from "ygo-core/dist/commands/MoveCardCommand";

export const TooltipCommandWithCardName = memo(function ({
  command: baseCommand,
  duel,
}: TimelineCommandProps) {

  const command = baseCommand as any;
  const cardId = command.data.id;
  const card = duel.ygo.state.getCardData(cardId);

  if (!card || !cardId) {
    return <div className="command-tooltip">
      <div>
        <div>
          <b>{(command as any).type}</b>
        </div>
      </div>
    </div>
  }


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
