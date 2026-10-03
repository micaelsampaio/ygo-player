import { YGODuel } from "../../core/YGODuel";
import { Banish as GameBanish } from "../../../YGOPlayer/game/Banish";
import { Card } from "ygo-core";
import { pileCardProps } from "../components/pile-menu";
import { pileCardPressHandlers, PileViewer } from "./pile-viewer";

export function Banish({
  duel,
  banish,
  visible = true,
  hasAction,
}: {
  duel: YGODuel;
  banish: GameBanish;
  visible: boolean;
  hasAction: boolean;
}) {
  return (
    <PileViewer
      duel={duel}
      player={banish.player}
      pile={banish}
      visible={visible}
      hasAction={hasAction}
      menuEventType="card-banish-menu"
      closeType="banish"
      iconClass="b"
    >
      {(openCardMenu) => {
        const cards = duel.ygo.state.fields[banish.player].banishedZone;
        const isPlayerPOV = duel.perspective.isPlayerPOV(banish.player);
        return cards.map((card: Card) => {
          // A face-down banished card of the opponent's: its back, and no menu.
          const isVisible = card.position !== "facedown" || isPlayerPOV;
          return (
            <div key={card.index}>
              <div
                style={{ position: "relative" }}
                {...pileCardPressHandlers(duel, card)}
                onClick={(e) => { if (isVisible) openCardMenu(e, card); }}
                {...(isVisible ? pileCardProps<HTMLDivElement>((e) => openCardMenu(e, card), card.name) : {})}
              >
                <img
                  src={
                    isVisible
                      ? card.images.small_url
                      : duel.createCdnUrl("/images/card_back.png")
                  }
                  className="ygo-card"
                />
                {isPlayerPOV && card?.position?.includes("facedown") && (
                  <div className="ygo-card-banish-fd-icon"></div>
                )}
              </div>
            </div>
          );
        });
      }}
    </PileViewer>
  );
}
