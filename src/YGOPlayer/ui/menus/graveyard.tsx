import { YGODuel } from "../../core/YGODuel";
import { Graveyard as GameGraveyard } from "../../../YGOPlayer/game/Graveyard";
import { Card } from "ygo-core";
import { pileCardProps } from "../components/pile-menu";
import { pileCardPressHandlers, PileViewer } from "./pile-viewer";

export function Graveyard({
  duel,
  graveyard,
  visible = true,
  hasAction,
}: {
  duel: YGODuel;
  graveyard: GameGraveyard;
  visible: boolean;
  hasAction: boolean;
}) {
  return (
    <PileViewer
      duel={duel}
      player={graveyard.player}
      pile={graveyard}
      visible={visible}
      hasAction={hasAction}
      menuEventType="card-gy-menu"
      closeType="graveyard"
      iconClass="gy"
    >
      {(openCardMenu) => duel.ygo.state.fields[graveyard.player].graveyard.map((card: Card) => (
        <div key={card.index}>
          <img
            {...pileCardPressHandlers(duel, card)}
            onClick={(e) => openCardMenu(e, card)}
            {...pileCardProps<HTMLImageElement>((e) => openCardMenu(e, card), card.name)}
            alt={card.name}
            src={card.images.small_url}
            className="ygo-card"
          />
        </div>
      ))}
    </PileViewer>
  );
}
