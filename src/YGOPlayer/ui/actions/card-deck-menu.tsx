import { useCallback } from "react";
import { Card, FieldZone } from "../../../YGOCore/types/types";
import { YGODuel } from "../../core/YGODuel";
import { CardMenu } from "../components/CardMenu";
import { YGOGameUtils } from "../../../YGOCore";

export function CardDeckMenu({ duel, card, mouseEvent }: { duel: YGODuel, zone: FieldZone, card: Card, clearAction: Function, mouseEvent: React.MouseEvent }) {
    const x = mouseEvent.clientX; // Horizontal mouse position in px
    const y = mouseEvent.clientY; // Vertical mouse position in px
    const player = duel.getActivePlayer();
    const field = duel.ygo.getField(player);
    const cardIndex = field.mainDeck.findIndex((cardToSearch) => cardToSearch === card);
    const originZone: FieldZone = YGOGameUtils.createZone("D", player, cardIndex + 1);

    const toHand = useCallback(() => {
        duel.gameActions.toHand({ card, originZone });
    }, [card]);

    const toGy = useCallback(() => {
        duel.gameActions.sendToGy({ card, originZone });
    }, [card]);

    return <>
        <CardMenu x={x} y={y}>
            <button className="ygo-card-item" type="button" onClick={toHand}>To Hand</button>
            <button className="ygo-card-item" type="button" onClick={toGy}>To GY</button>
        </CardMenu>
    </>

}