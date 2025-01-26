import { useLayoutEffect, useRef } from "react";
import { YGOCommands, YGOGameUtils } from "../../../YGOCore";
import { Card, CardPosition, FieldZone } from "../../../YGOCore/types/types";
import { ActionCardSelection } from "../../actions/ActionSelectCard";
import { YGODuel } from "../../core/YGODuel";
import { CardZone } from "../../game/CardZone";
import { getCardZones, getGameZone, getMonstersZones } from "../../scripts/ygo-utils";
import { UiGameConfig } from "../YGOUiController";
import { ActionUiMenu } from "../../actions/ActionUiMenu";
import { CardZoneKV } from "../../types";

export function CardExtraDeckMenu({ duel, config, card, clearAction, mouseEvent }: { duel: YGODuel, zone: FieldZone, card: Card, clearAction: Function, mouseEvent: React.MouseEvent, config: UiGameConfig }) {
    const x = mouseEvent.clientX; // Horizontal mouse position in px
    const y = mouseEvent.clientY; // Vertical mouse position in px
    const menuRef = useRef<HTMLDivElement>(null);

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

    const synchroSummon = ({ position }: { position: CardPosition }) => {
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

                        ygo.exec(new YGOCommands.SynchroSummonCommand({
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

    const synchroSummonATK = () => {
        synchroSummon({ position: "faceup-attack" });
    }

    const synchroSummonDEF = () => {
        synchroSummon({ position: "faceup-defense" });
    }

    const fusionSummon = ({ position }: { position: CardPosition }) => {
        duel.events.publish("toggle-ui-menu", {
            key: "game-popup", type: "select-card-menu", data: {
                onSelectCards: (cards: CardZoneKV[]) => {

                    duel.events.publish("close-ui-menu", { type: "select-card-menu" });

                    const ygo = duel.ygo;
                    const cardSelection = duel.gameController.getComponent<ActionCardSelection>("action_card_selection")!;
                    const cardIndex = duel.ygo.state.fields[0].extraDeck.findIndex((c) => c === card);

                    const materials = cards.map(cardData => {
                        return { id: cardData.card.id, zone: cardData.zone };
                    })

                    const zonesToSummon = getCardZones(duel, [0], ["M", "EMZ"]);

                    materials.forEach(material => {
                        const zoneData = YGOGameUtils.getZoneData(material.zone);
                        if (zoneData.zone === "M") {
                            const cardZone = getGameZone(duel, zoneData)!;
                            zonesToSummon.push(cardZone);
                        }
                    });

                    cardSelection.startSelection({
                        zones: zonesToSummon,
                        onSelectionCompleted: (cardZone: any) => {

                            ygo.exec(new YGOCommands.FusionSummonCommand({
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
            }
        });
    }

    const fusionSummonATK = () => {
        fusionSummon({ position: "faceup-attack" });
    }

    const fusionSummonDEF = () => {
        fusionSummon({ position: "faceup-defense" });
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

    useLayoutEffect(() => {
        const container = menuRef.current!;
        const size = container.getBoundingClientRect();
        container.style.left = "unset";
        container.style.top = y + "px";
        container.style.right = (size.width - 30) + "px";
    }, [card, x, y]);


    const isLink = YGOGameUtils.isLinkMonster(card);
    const isSynchro = YGOGameUtils.isSynchroMonster(card);
    const isFusion = YGOGameUtils.isFusionMonster(card);
    const isXYZ = YGOGameUtils.isXYZMonster(card);

    return <>
        <div ref={menuRef} className="ygo-card-menu" onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            duel.events.publish("clear-ui-action");
        }}>

            <div onClick={e => e.stopPropagation()}>
                {config.actions && <div>
                    EXTRA DECK<br />

                    {isLink && <button type="button" onClick={linkSummon}>Link Summon</button>}

                    {isSynchro && <div>
                        <div>
                            <button type="button" onClick={synchroSummonATK}>Synchro Summon ATK</button>
                        </div>
                        <div>
                            <button type="button" onClick={synchroSummonDEF}>Synchro Summon DEF</button>
                        </div>
                    </div>
                    }

                    {isFusion && <div>
                        <div>
                            <button type="button" onClick={fusionSummonATK}>Fusion Summon ATK</button>
                        </div>
                        <div>
                            <button type="button" onClick={fusionSummonDEF}>Fusion Summon DEF</button>
                        </div>
                    </div>
                    }

                    {isXYZ && <button type="button" onClick={xyzSummonATK}>XYZ Summon ATK</button>}
                    {isXYZ && <button type="button" onClick={xyzSummonDEF}>XYZ Summon DEF</button>}

                    <button type="button" onClick={specialSummonDEF}>SS Def</button>
                    <button type="button" onClick={specialSummonATK}>Add To Hand</button>
                </div>}

            </div>
        </div>
    </>

}