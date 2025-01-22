import { YGOCommands, YGOGameUtils } from "../../../YGOCore";
import { Card, CardPosition, FieldZone } from "../../../YGOCore/types/types";
import { ActionCardSelection } from "../../actions/ActionSelectCard";
import { YGODuel } from "../../core/YGODuel";
import { CardZone } from "../../game/CardZone";
import { getCardZones, getMonstersZones } from "../../scripts/ygo-utils";
import { UiGameConfig } from "../YGOUiController";

export function CardExtraDeckMenu({ duel, config, card, clearAction, mouseEvent }: { duel: YGODuel, zone: FieldZone, card: Card, clearAction: Function, mouseEvent: React.MouseEvent, config: UiGameConfig }) {
    const x = mouseEvent.clientX; // Horizontal mouse position in px
    const y = mouseEvent.clientY; // Vertical mouse position in px

    const linkSummon = () => {
        clearAction();

        const ygo = duel.ygo;
        const cardIndex = duel.ygo.state.fields[0].extraDeck.findIndex((c) => c === card);
        const cardSelection = duel.gameController.getComponent<ActionCardSelection>("action_card_selection")!;
        const zones = getMonstersZones(duel, [0]);

        cardSelection.startMultipleSelection({
            zones,
            onSelectionCompleted: (cardZones: CardZone[]) => {

                const materials = cardZones.map(cardZone => {
                    return {
                        id: cardZone.getCardReference()!.id,
                        zone: cardZone.zone
                    }
                });

                const zonesToSummon = getCardZones(duel, [0], ["M", "EMZ"]);
                cardZones.forEach(z => zonesToSummon.push(z));

                cardSelection.startSelection({
                    zones: zonesToSummon,
                    onSelectionCompleted: (cardZone: any) => {

                        ygo.exec(new YGOCommands.LinkSummonCommand({
                            player: 0,
                            id: card.id,
                            materials,
                            originZone: `ED-${cardIndex + 1}`,
                            zone: cardZone.zone,
                        }));

                        clearAction();
                    }
                });

            }
        });
    }

    const xyzSummon = ({ position }: { position: CardPosition }) => {
        clearAction();

        const ygo = duel.ygo;
        const cardIndex = duel.ygo.state.fields[0].extraDeck.findIndex((c) => c === card);
        const cardSelection = duel.gameController.getComponent<ActionCardSelection>("action_card_selection")!;
        const zones = getMonstersZones(duel, [0]);

        cardSelection.startMultipleSelection({
            zones,
            onSelectionCompleted: (cardZones: CardZone[]) => {

                const materials = cardZones.map(cardZone => {
                    return {
                        id: cardZone.getCardReference()!.id,
                        zone: cardZone.zone
                    }
                });

                const zonesToSummon = getCardZones(duel, [0], ["M", "EMZ"]);
                cardZones.forEach(z => zonesToSummon.push(z));

                cardSelection.startSelection({
                    zones: zonesToSummon,
                    onSelectionCompleted: (cardZone: any) => {

                        ygo.exec(new YGOCommands.XYZSummonCommand({
                            player: 0,
                            id: card.id,
                            materials,
                            originZone: `ED-${cardIndex + 1}`,
                            zone: cardZone.zone,
                            position
                        }));

                        clearAction();
                    }
                });

            }
        });
    }

    const xyzSummonATK = () => {
        xyzSummon({ position: "faceup-attack" });
    }

    const xyzSummonDEF = () => {
        xyzSummon({ position: "faceup-defense" });
    }

    const specialSummonATK = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const ygo = duel.ygo;

        clearAction();
        const gyIndex = duel.ygo.state.fields[0].graveyard.findIndex((c) => c === card);
        const cardSelection = duel.gameController.getComponent<ActionCardSelection>("action_card_selection")!;
        const zones = getCardZones(duel, [0], ["M"]);

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
        const ygo = duel.ygo;

        clearAction();
        const gyIndex = duel.ygo.state.fields[0].graveyard.findIndex((c) => c === card);
        const cardSelection = duel.gameController.getComponent<ActionCardSelection>("action_card_selection")!;
        const zones = getCardZones(duel, [0], ["M"]);

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

    const isLink = YGOGameUtils.isLinkMonster(card);
    const isXYZ = YGOGameUtils.isXYZMonter(card);

    return <>
        <div className="ygo-card-menu" style={{ top: `${y}px`, left: `${x}px` }} onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            duel.events.publish("clear-ui-action");
        }}>

            <div onClick={e => e.stopPropagation()}>
                {config.actions && <div>
                    EXTRA DECK<br />

                    {isLink && <button type="button" onClick={linkSummon}>Link Summon</button>}

                    {isXYZ && <button type="button" onClick={xyzSummonATK}>XYZ Summon ATK</button>}
                    {isXYZ && <button type="button" onClick={xyzSummonDEF}>XYZ Summon DEF</button>}

                    <button type="button" onClick={specialSummonDEF}>SS Def</button>
                    <button type="button" onClick={specialSummonATK}>Add To Hand</button>
                </div>}

            </div>
        </div>
    </>

}