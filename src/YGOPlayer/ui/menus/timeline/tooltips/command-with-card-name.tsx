import { memo } from "react";
import { TimelineCommandProps } from "../../timeline";
//import { MoveCardCommand } from "ygo-core/dist/commands/MoveCardCommand";

export const TooltipCommandWithCardName = memo(function ({
  command: baseCommand,
  duel,
}: TimelineCommandProps) {

  const command = baseCommand as any;
  const cardId = command.data.id;
  const cardIds = command.data.ids;
  const card = duel.ygo.state.getCardData(cardId);

  if (cardIds) {
    const names = cardIds?.map((c: any) => duel.ygo.state.getCardData(c.id)?.name).filter(Boolean).map((name: string) => <div>{name}</div>)
    return (
      <div className="command-tooltip">
        <div>
          <div>
            <b>{command.type}({command.commandId})</b>
          </div>
          <div>{names || ""}</div>
        </div>
      </div>
    );
  }

  if (!card || !cardId) {
    return <div className="command-tooltip">
      <div>
        <div>
          <b>{command.type} ({command.commandId})</b>
        </div>
      </div>
    </div>
  }


  return (
    <div className="command-tooltip">
      <div>
        <div>
          <b>{command.type}({command.commandId})</b>
        </div>
        <div>{card?.name}</div>
      </div>
    </div>
  );
});
