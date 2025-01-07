import { YGOCommands, YGOGameUtils } from "../../../YGOCore";
import { Card, FieldZone } from "../../../YGOCore/types/types";
import { ActionCardSelection } from "../../actions/ActionSelectCard";
import { YGODuel } from "../../core/YGODuel";
import { getXyzMonstersZones } from "../../scripts/ygo-utils";

export function CardZoneMenu({ duel, card, zone, clearAction, mouseEvent }: { duel: YGODuel, zone: FieldZone, card: Card, clearAction: Function, mouseEvent: React.MouseEvent }) {
    const x = mouseEvent.clientX; // Horizontal mouse position in px
    const y = mouseEvent.clientY; // Vertical mouse position in px

    const sendToGY = (e: React.MouseEvent) => {
        console.log("TEMP:: Send TO GY SUMMON", e.target);
        e.stopPropagation();
        e.preventDefault();

        clearAction();

        duel.ygo.exec(new YGOCommands.SendCardToGYCommand({
            player: 0,
            id: card.id,
            originZone: zone
        }));
    }

    const banish = () => {
        banishCommand("faceup");
    }

    const banishFD = () => {
        banishCommand("facedown");
    }

    const banishCommand = (position = "faceup") => {
        clearAction();

        duel.ygo.exec(new YGOCommands.BanishCommand({
            player: 0,
            id: card.id,
            originZone: zone,
            position: position === 'faceup' ? "faceup" : "facedown"
        }));
    }

    const viewMaterials = () => {
        duel.events.publish("toggle-ui-menu", { key: "game-overlay", autoClose: true, type: "xyz-monster-materials", data: { card, zone } });
    }


    const attachMaterial = () => {
        clearAction();
        const ygo = duel.ygo;
        const cardSelection = duel.gameController.getComponent<ActionCardSelection>("action_card_selection")!;
        const xyzZones = getXyzMonstersZones(duel, [0]);

        if (xyzZones.length === 0) return;

        cardSelection.startSelection({
            zones: xyzZones,
            onSelectionCompleted: (cardZone: any) => {

                ygo.exec(new YGOCommands.XYZAttachMaterialCommand({
                    player: 0,
                    id: card.id,
                    originZone: zone,
                    zone: cardZone.zone
                }));
                console.log("ATTACH MATERIAL")
                console.log(ygo.state.fields)
            }
        });
    }

    const field = duel.ygo.state.fields[0];
    const isXYZ = YGOGameUtils.isXYZMonter(card);
    const hasXyzMonstersInField = YGOGameUtils.hasXyzMonstersInField(field);
    const canAttachMaterial = isXYZ ? getXyzMonstersZones(duel, [0]).length > 1 : true;

    return <>
        <div className="ygo-card-menu" style={{ top: `${y}px`, left: `${x}px` }} onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            duel.events.publish("clear-ui-action");
            console.log("TEMP:: MOUSE CLICK REACT", e.target);
        }}>
            {isXYZ && <div>
                <div>
                    <button type="button" onClick={viewMaterials}>View Materials</button>
                </div>
            </div>}
            <div onClick={e => e.stopPropagation()}>
                <button type="button" onClick={sendToGY}>Send To GY</button>
            </div>
            <div onClick={e => e.stopPropagation()}>
                <button type="button" onClick={banish}>Banish</button>
            </div>
            <div onClick={e => e.stopPropagation()}>
                <button type="button" onClick={banishFD}>Banish FD</button>
            </div>
            {
                hasXyzMonstersInField && <div>
                    {canAttachMaterial && <button type="button" onClick={attachMaterial}>Attach Material</button>}
                </div>
            }
        </div>
    </>

}