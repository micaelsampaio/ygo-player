import { YGOCore } from "ygo-core";
import { YGODuel } from "../../../core/YGODuel";
import { memo } from "react";
import { DuelLogContainer, DuelLogRow } from "./duel-log-components";

export const StartHandLogRow = memo(function ({
  log,
  duel,
  ygo,
}: {
  log: any;
  duel: YGODuel;
  ygo: InstanceType<typeof YGOCore>;
}) {
  return (
    <DuelLogRow log={log}>
      <DuelLogContainer>
        <div>
          <div className="ygo-text-sm ygo-text-bold">
            {log.type}
          </div>
          <div className="ygo-flex ygo-gap-1" style={{ flexWrap: "wrap" }}>
            {log.cards.map((cardData: any) => {
              const card = ygo.state.getCardData(cardData.id)!;
              if (!card) return null;
              return (
                <div>
                  <img
                    onMouseDown={(event: any) => duel.events.dispatch("on-card-mouse-down", { card, event })}
                    onMouseUp={(event: any) => duel.events.dispatch("on-card-mouse-up", { card, event })}
                    onTouchStart={(event: any) => duel.events.dispatch("on-card-mouse-down", { card, event })}
                    onTouchEnd={(event: any) => duel.events.dispatch("on-card-mouse-up", { card, event })}
                    onClick={() => duel.events.dispatch("set-selected-card", { player: log.player, card })}
                    src={card.images.small_url}
                    style={{ width: "40px" }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </DuelLogContainer>
    </DuelLogRow>
  );
})
