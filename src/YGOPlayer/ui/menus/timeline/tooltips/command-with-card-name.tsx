import { memo } from "react";
import type { TimelineCommandProps } from "../types";

export const TooltipCommandWithCardName = memo(function ({
  command,
  duel,
}: TimelineCommandProps) {

  const cardId: number | undefined = command.data.id;
  const cardIds: { id: number }[] | undefined = command.data.ids;
  const card = cardId === undefined ? null : duel.ygo.state.getCardData(cardId);
  const showCards = !duel.ygo.options.viewOpponentCards;
  
  if (cardIds) {
    const names = cardIds.map((c) => duel.ygo.state.getCardData(c.id)?.name).filter(Boolean).map((name) => <div>{name}</div>)

    return (
      <div className="command-tooltip">
        <div>
          <div>
            <b>{command.type}</b>
          </div>
          {showCards && <div>{names}</div>}
        </div>
      </div>
    );
  }

  if (!card || !cardId) {
    return <div className="command-tooltip">
      <div>
        <div>
          <b>{command.type}</b>
        </div>
      </div>
    </div>
  }

  return (
    <div className="command-tooltip">
      <div>
        <div>
          <b>{command.type}</b>
        </div>
        {!showCards && <div>{card?.name}</div>}
      </div>
    </div>
  );
});
