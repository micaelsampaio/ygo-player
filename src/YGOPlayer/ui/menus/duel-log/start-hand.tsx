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
          <div className="ygo-text-4 ygo-text-bold">
            {log.type}
          </div>
          <div className="ygo-flex ygo-gap-1" style={{ flexWrap: "wrap" }}>
            {log.cards.map((cardData: any) => {
              const card = ygo.state.getCardData(cardData.id)!;
              if (!card) return null;
              return (
                <div>
                  <img
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
