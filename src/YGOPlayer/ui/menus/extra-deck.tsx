import { useEffect, useState } from "react";
import { YGODuel } from "../../core/YGODuel";
import { Card, YGOGameUtils } from "ygo-core";
import { pileCardProps } from "../components/pile-menu";
import { summonableExtraDeckCodes } from "./extra-deck-highlight";
import { YGOStatic } from "../../core/YGOStatic";
import { pileCardPressHandlers, PileViewer } from "./pile-viewer";

export function ExtraDeck({
  duel,
  player,
  hasAction,
  visible = true,
}: {
  player: number;
  duel: YGODuel;
  visible: boolean;
  hasAction: boolean;
}) {
  const [summonable, setSummonable] = useState<Set<number>>(() => summonableExtraDeckCodes(duel.assistOptions as any));
  useEffect(() => {
    const onOptions = (res: unknown) => setSummonable(summonableExtraDeckCodes(res as any));
    duel.events.on("assist-options", onOptions);
    return () => duel.events.off("assist-options", onOptions);
  }, [duel]);

  return (
    <PileViewer
      duel={duel}
      player={player}
      pile={duel && player >= 0 ? duel.fields[player].extraDeck : null}
      visible={visible}
      hasAction={hasAction}
      menuEventType="card-extra-deck-menu"
      closeType="extra-deck"
      iconClass="ed"
    >
      {(openCardMenu) => duel.ygo.state.fields[player].extraDeck.map((card: Card, cardIndex: number) => {
        // Assisted Mode: the viewer's own cards the engine lets them Special Summon now.
        const offered = player === YGOStatic.playerIndex && summonable.has(card.id);
        return (
          <div key={card.index}>
            <img
              {...pileCardPressHandlers(duel, card)}
              onClick={(e) => openCardMenu(e, card)}
              {...pileCardProps<HTMLImageElement>((e) => openCardMenu(e, card), card.name)}
              alt={card.name}
              onContextMenu={(e) => {
                e.preventDefault();
                const originZone = YGOGameUtils.createZone("ED", player, cardIndex + 1);
                duel.gameActions.targetCard({ card, originZone });
              }}
              src={card.images.small_url}
              className={offered ? "ygo-card ygo-card-offered" : "ygo-card"}
              title={offered ? `${card.name}: can be Special Summoned now` : undefined}
            />
          </div>
        );
      })}
    </PileViewer>
  );
}
