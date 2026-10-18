import { YGOCore, YGODuelEvents } from "ygo-core";
import { YGODuel } from "../../../core/YGODuel";
import { memo } from "react";
import { DuelLogContainer, DuelLogRow } from "./duel-log-components";
import { pileCardPressHandlers } from "../pile-viewer";

import { clickableProps } from "../../components/a11y";
export const StartHandLogRow = memo(function ({
  log,
  duel,
  ygo,
}: {
  log: YGODuelEvents.StartHand | YGODuelEvents.SwapHand;
  duel: YGODuel;
  ygo: InstanceType<typeof YGOCore>;
}) {
  const showCards = duel.fields[log.player].settings.showCards;
  return (
    <DuelLogRow log={log}>
      <DuelLogContainer>
        <div>
          <div className="ygo-text-sm ygo-text-bold">
            {log.type}
          </div>
          <div className="ygo-flex ygo-gap-1" style={{ flexWrap: "wrap" }}>
            {log.cards.map((cardData) => {
              const card = ygo.state.getCardData(cardData.id)!;
              if (!card) return null;

              if (!showCards) return <div>
                <img
                  src={duel.createCdnUrl("/images/card_back.png")}
                  style={{ width: "40px" }}
                />
              </div>
              return (
                <div>
                  <img
                    {...pileCardPressHandlers(duel, card)}
                    {...clickableProps(() => duel.gameActions.setSelectedCard({ player: log.player, card }), card.name)}
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
