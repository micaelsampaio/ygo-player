import { YGOCommands, YGOGameUtils } from "../../../YGOCore";
import { Card, CardPosition, FieldZone } from "../../../YGOCore/types/types";
import { ActionCardSelection } from "../../actions/ActionSelectCard";
import { YGODuel } from "../../core/YGODuel";
import { CardZone } from "../../game/CardZone";
import { getCardZones, getMonstersZones } from "../../scripts/ygo-utils";

export function CardDeckMenu({ duel, card, clearAction, mouseEvent }: { duel: YGODuel, zone: FieldZone, card: Card, clearAction: Function, mouseEvent: React.MouseEvent }) {
    const x = mouseEvent.clientX; // Horizontal mouse position in px
    const y = mouseEvent.clientY; // Vertical mouse position in px
    const player = duel.getActivePlayer();

    const toHand = () => {
        clearAction();

        const ygo = duel.ygo;    
        const field = ygo.getField(player);
        const cardIndex = field.mainDeck.findIndex((cardToSearch) => cardToSearch === card);

        ygo.exec(new YGOCommands.ToHandCommand({
            player,
            id: card.id,
            originZone: `D-${cardIndex + 1}`
        }));

        clearAction();
    }

    const toGy = () => {
        clearAction();

        const ygo = duel.ygo;
        const field = ygo.getField(duel.getActivePlayer());
        const cardIndex = field.mainDeck.findIndex((cardToSearch) => cardToSearch === card);

        ygo.exec(new YGOCommands.SendCardToGYCommand({
            player,
            id: card.id,
            originZone: `D-${cardIndex + 1}`
        }));

        clearAction();
    }

    return <>
        <div className="ygo-card-menu" style={{ top: `${y}px`, left: `${x}px` }} onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            duel.events.publish("clear-ui-action");
            console.log("TEMP:: MOUSE CLICK REACT", e.target);
        }}>
            <div onClick={e => e.stopPropagation()}>
                <div>
                    View DECK<br />

                    <button type="button" onClick={toHand}>To Hand</button>
                    <button type="button" onClick={toGy}>To GY</button>
                </div>
            </div>
        </div>
    </>

}