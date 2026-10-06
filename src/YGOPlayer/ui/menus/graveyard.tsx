import { YGODuel } from "../../core/YGODuel";
import { Graveyard as GameGraveyard } from "../../../YGOPlayer/game/Graveyard";
import { Card } from "ygo-core";
import { pileCardProps } from "../components/pile-menu";
import { pileCardPressHandlers, PileViewer } from "./pile-viewer";
import { useOfferedPileCodes } from "./use-offered-pile";
import { LOC_GRAVE } from "../assist-prompt";

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
  // Assisted Mode: the viewer's own GY cards with something to do now (an effect, a summon) are framed.
  const offered = useOfferedPileCodes(duel, LOC_GRAVE);
  const own = graveyard.player === duel.perspective.playerIndex;
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
            className={own && offered.has(card.id) ? "ygo-card ygo-card-offered" : "ygo-card"}
          />
        </div>
      ))}
    </PileViewer>
  );
}
