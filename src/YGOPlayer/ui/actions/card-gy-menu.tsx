import { YGOCommands, YGOGameUtils } from "../../../YGOCore";
import { Card, FieldZone } from "../../../YGOCore/types/types";
import { ActionCardSelection } from "../../actions/ActionSelectCard";
import { YGODuel } from "../../core/YGODuel";
import { getCardZones, getXyzMonstersZones } from "../../scripts/ygo-utils";

export function CardGraveyardMenu({ duel, card, clearAction, mouseEvent }: { duel: YGODuel, zone: FieldZone, card: Card, clearAction: Function, mouseEvent: React.MouseEvent }) {
    const x = mouseEvent.clientX; // Horizontal mouse position in px
    const y = mouseEvent.clientY; // Vertical mouse position in px

    const specialSummonATK = (e: React.MouseEvent) => {
        console.log("TEMP:: NORMAL SUMMON", e.target);

        console.log("   >> NORMAL SUMMON CARD");

        const ygo = duel.ygo;

        clearAction();
        const gyIndex = duel.ygo.state.fields[0].graveyard.findIndex((c) => c === card);
        const cardSelection = duel.gameController.getComponent<ActionCardSelection>("action_card_selection")!;
        const zones = getCardZones(duel, [0], ["M"]);
        console.log("AVAILABLE ZONES 1111::", zones);

        cardSelection.startSelection({
            zones,
            onSelectionCompleted: (cardZone: any) => {
                ygo.exec(new YGOCommands.SpecialSummonCommand({
                    player: 0,
                    id: card.id,
                    originZone: `GY-${gyIndex + 1}`,
                    zone: cardZone.zone,
                    position: "faceup-attack"
                }));
            }
        });
    }

    const specialSummonDEF = (e: React.MouseEvent) => {
        console.log("TEMP:: NORMAL SUMMON", e.target);

        console.log("   >> NORMAL SUMMON CARD");

        const ygo = duel.ygo;

        clearAction();
        const gyIndex = duel.ygo.state.fields[0].graveyard.findIndex((c) => c === card);
        const cardSelection = duel.gameController.getComponent<ActionCardSelection>("action_card_selection")!;
        const zones = getCardZones(duel, [0], ["M"]);
        console.log("AVAILABLE ZONES 1111::", zones);

        cardSelection.startSelection({
            zones,
            onSelectionCompleted: (cardZone: any) => {
                ygo.exec(new YGOCommands.SpecialSummonCommand({
                    player: 0,
                    id: card.id,
                    originZone: `GY-${gyIndex + 1}`,
                    zone: cardZone.zone,
                    position: "faceup-defense"
                }));
            }
        });
    }

    const attachMaterial = () => {
        clearAction();
        const ygo = duel.ygo;
        const cardSelection = duel.gameController.getComponent<ActionCardSelection>("action_card_selection")!;
        const xyzZones = getXyzMonstersZones(duel, [0]);

        if (xyzZones.length === 0) return;

        const gyIndex = duel.ygo.state.fields[0].graveyard.findIndex((c) => c === card);

        cardSelection.startSelection({
            zones: xyzZones,
            onSelectionCompleted: (cardZone: any) => {

                ygo.exec(new YGOCommands.XYZAttachMaterialCommand({
                    player: 0,
                    id: card.id,
                    originZone: `GY-${gyIndex + 1}`,
                    zone: cardZone.zone
                }));
                console.log("ATTACH MATERIAL")
                console.log(ygo.state.fields)
            }
        });
    }

    const field = duel.ygo.state.fields[0];
    const hasXyzMonstersInField = YGOGameUtils.hasXyzMonstersInField(field);

    return <>
        <div className="ygo-card-menu" style={{ top: `${y}px`, left: `${x}px` }} onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            duel.events.publish("clear-ui-action");
            console.log("TEMP:: MOUSE CLICK REACT", e.target);
        }}>
            <div onClick={e => e.stopPropagation()}>
                <button type="button" onClick={specialSummonATK}>SS Atk</button>
                <button type="button" onClick={specialSummonDEF}>SS Def</button>
                <button type="button" onClick={specialSummonATK}>Add To Hand</button>
                {hasXyzMonstersInField && <div>
                    <button type="button" onClick={attachMaterial}>Attach Material</button>
                </div>}
            </div>
        </div>
    </>

}