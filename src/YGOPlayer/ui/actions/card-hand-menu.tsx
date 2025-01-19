import { YGOCommands, YGOGameUtils } from "../../../YGOCore";
import { ActionCardSelection } from "../../actions/ActionSelectCard";
import { YGODuel } from "../../core/YGODuel";
import { getCardZones, getTransformFromCamera, getXyzMonstersZones } from "../../scripts/ygo-utils";
import { Card } from "../../../YGOCore/types/types";
import { useLayoutEffect, useRef, useState } from "react";

export function CardHandMenu({ duel: duel2, card: card2, index, clearAction, mouseEvent }: any) {
    const x = mouseEvent.clientX; // Horizontal mouse position in px
    const y = mouseEvent.clientY; // Vertical mouse position in px
    const duel = duel2 as YGODuel;
    const card = card2 as Card;
    const menuRef = useRef<HTMLDivElement>(null);

    const normalSummon = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("TEMP:: NORMAL SUMMON", e.target);

        console.log("   >> NORMAL SUMMON CARD");

        const ygo = duel.ygo;

        clearAction();

        const cardSelection = duel.gameController.getComponent<ActionCardSelection>("action_card_selection")!;
        const zones = getCardZones(duel, [0], ["M"]);
        console.log("AVAILABLE ZONES 1111::", zones);

        cardSelection.startSelection({
            zones,
            onSelectionCompleted: (cardZone: any) => {
                ygo.exec(new YGOCommands.NormalSummonCommand({
                    player: 0,
                    id: card.id,
                    originZone: `H-${index + 1}`,
                    zone: cardZone.zone
                }));
            }
        });
    }

    const SetSummon = (e: React.MouseEvent) => {
        const ygo = duel.ygo;

        clearAction();

        const cardSelection = duel.gameController.getComponent<ActionCardSelection>("action_card_selection")!;
        const zones = getCardZones(duel, [0], ["M"]);

        console.log("AVAILABLE ZONES::", zones);

        cardSelection.startSelection({
            zones,
            onSelectionCompleted: (cardZone: any) => {
                ygo.exec(new YGOCommands.SetMonsterCommand({
                    player: 0,
                    id: card.id,
                    originZone: `H-${index + 1}`,
                    zone: cardZone.zone
                }));
            }
        });
    }

    const specialSummonATK = (e: React.MouseEvent) => {
        console.log("TEMP:: NORMAL SUMMON", e.target);

        console.log("   >> NORMAL SUMMON CARD");

        const ygo = duel.ygo;

        clearAction();

        const cardSelection = duel.gameController.getComponent<ActionCardSelection>("action_card_selection")!;
        const zones = getCardZones(duel, [0], ["M"]);
        console.log("AVAILABLE ZONES 1111::", zones);

        cardSelection.startSelection({
            zones,
            onSelectionCompleted: (cardZone: any) => {
                ygo.exec(new YGOCommands.SpecialSummonCommand({
                    player: 0,
                    id: card.id,
                    originZone: `H-${index + 1}`,
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

        const cardSelection = duel.gameController.getComponent<ActionCardSelection>("action_card_selection")!;
        const zones = getCardZones(duel, [0], ["M"]);
        console.log("AVAILABLE ZONES 1111::", zones);

        cardSelection.startSelection({
            zones,
            onSelectionCompleted: (cardZone: any) => {
                ygo.exec(new YGOCommands.SpecialSummonCommand({
                    player: 0,
                    id: card.id,
                    originZone: `H-${index + 1}`,
                    zone: cardZone.zone,
                    position: "faceup-defense"
                }));
            }
        });
    }

    const SetSpellTrap = (e: React.MouseEvent) => {
        const ygo = duel.ygo;

        clearAction();

        const cardSelection = duel.gameController.getComponent<ActionCardSelection>("action_card_selection")!;
        const zones = getCardZones(duel, [0], ["S"]);

        cardSelection.startSelection({
            zones,
            onSelectionCompleted: (cardZone: any) => {
                ygo.exec(new YGOCommands.SetCardCommand({
                    player: 0,
                    id: card.id,
                    originZone: `H-${index + 1}`,
                    zone: cardZone.zone
                }));
            }
        });
    }

    const ActivateSpellTrap = (e: React.MouseEvent) => {
        const ygo = duel.ygo;

        clearAction();

        const cardSelection = duel.gameController.getComponent<ActionCardSelection>("action_card_selection")!;
        const zones = getCardZones(duel, [0], ["S"]);

        cardSelection.startSelection({
            zones,
            onSelectionCompleted: (cardZone: any) => {
                ygo.exec(new YGOCommands.ActivateCardCommand({
                    player: 0,
                    id: card.id,
                    originZone: `H-${index + 1}`,
                    zone: cardZone.zone
                }));
            }
        });
    }

    const SendToGy = (e: React.MouseEvent) => {
        console.log("TEMP:: Send TO GY SUMMON", e.target);
        e.stopPropagation();
        e.preventDefault();

        clearAction();

        duel.ygo.exec(new YGOCommands.SendCardToGYCommand({
            player: 0,
            id: card.id,
            originZone: `H-${index + 1}`,
        }));
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
                    originZone: `H-${index + 1}`,
                    zone: cardZone.zone
                }));
                console.log("ATTACH MATERIAL")
                console.log(ygo.state.fields)
            }
        });
    }

    const ActivateFieldSpell = (e: React.MouseEvent) => {
        const ygo = duel.ygo;

        clearAction();

        const zones = getCardZones(duel, [0], ["F"]);

        if (zones.length > 0) {
            ygo.exec(new YGOCommands.FieldSpellCommand({
                player: 0,
                id: card.id,
                originZone: `H-${index + 1}`,
                zone: zones[0].zone as any,
                position: "faceup"
            }));
        }
    }

    const SetFieldSpell = (e: React.MouseEvent) => {
        const ygo = duel.ygo;

        clearAction();

        const zones = getCardZones(duel, [0], ["F"]);

        if (zones.length > 0) {
            ygo.exec(new YGOCommands.FieldSpellCommand({
                player: 0,
                id: card.id,
                originZone: `H-${index + 1}`,
                zone: zones[0].zone as any,
                position: "facedown"
            }));
        }
    }

    useLayoutEffect(() => {
        const container = menuRef.current!;
        const cardFromHand = duel.fields[0].hand.getCardFromReference(card)!;
        const size = container.getBoundingClientRect();

        const { x, y, width, height } = getTransformFromCamera(duel, cardFromHand.gameObject);

        container.style.top = (y - size.height) + "px";
        container.style.left = x + "px";
    }, [card]);

    const field = duel.ygo.state.fields[0];
    const freeMonsterZones = field.monsterZone.filter(zone => !zone).length;
    const freeSpellTrapZones = field.spellTrapZone.filter(zone => !zone).length;
    const isFieldSpellFree = !field.fieldZone;
    const isFieldSpell = YGOGameUtils.isFieldSpell(card);
    const isSpell = !isFieldSpell && YGOGameUtils.isSpell(card);
    const isTrap = YGOGameUtils.isTrap(card);
    const isMonster = card.type.includes("Monster");
    const hasXyzMonstersInField = YGOGameUtils.hasXyzMonstersInField(field);

    return <>
        <div ref={menuRef} className="ygo-card-menu" onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            duel.events.publish("clear-ui-action");
        }}>
            <div onClick={e => e.stopPropagation()}>
                {isMonster && <>
                    <div>
                        <button disabled={freeMonsterZones === 0} type="button" onClick={normalSummon}>Normal Summon</button>
                    </div>
                    <div>
                        <button disabled={freeMonsterZones === 0} type="button" onClick={SetSummon}>Set</button>
                    </div>
                    <div>
                        <button disabled={freeMonsterZones === 0} type="button" onClick={specialSummonATK}>Special Summon ATK</button>
                    </div>
                    <div>
                        <button disabled={freeMonsterZones === 0} type="button" onClick={specialSummonDEF}>Special Summon DEF</button>
                    </div>
                </>}
                {hasXyzMonstersInField && <div>
                    <button type="button" onClick={attachMaterial}>Attach Material</button>
                </div>}
                {(isSpell || isTrap) && <>
                    <div>
                        <button type="button" disabled={freeSpellTrapZones === 0} onClick={ActivateSpellTrap}>Activate</button>
                    </div>
                    <div>
                        <button type="button" disabled={freeSpellTrapZones === 0} onClick={SetSpellTrap}>Set</button>
                    </div>
                </>}
                {(isFieldSpell) && <>
                    <div>
                        <button type="button" disabled={!isFieldSpellFree} onClick={ActivateFieldSpell}>Activate Field</button>
                    </div>
                    <div>
                        <button type="button" disabled={freeSpellTrapZones === 0} onClick={SetFieldSpell}>Set Field</button>
                    </div>
                </>}
                <div>
                    <button type="button" onClick={SendToGy}>Discard</button>
                </div>
            </div>
        </div>
    </>

}