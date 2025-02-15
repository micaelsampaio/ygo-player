import { YGOCommands, YGOGameUtils } from "../../YGOCore";
import { Card, CardPosition, FieldZone } from "../../YGOCore/types/types";
import { ActionCardSelection } from "../actions/ActionSelectCard";
import { CardZone } from "../game/CardZone";
import { getCardZones, getGameZone, getMonstersZones, getXyzMonstersZones } from "../scripts/ygo-utils";
import { CardZoneKV } from "../types";
import { YGODuel } from "./YGODuel";

export class YGOGameActions {

    private duel: YGODuel;
    private cardSelection: ActionCardSelection;

    constructor(duel: YGODuel) {
        this.duel = duel;
        this.cardSelection = this.duel.gameController.getComponent<ActionCardSelection>("action_card_selection");
    }

    //////////// UTILS
    private clearAction() {
        this.duel.events.publish("clear-ui-action");
    }

    //////////////////////// COMMANDS

    public normalSummon({ card, originZone }: { card: Card, originZone: FieldZone }) {
        this.clearAction();

        const ygo = this.duel.ygo;
        const player = this.duel.getActivePlayer();
        const zones = getCardZones(this.duel, [card.owner], ["M"]);

        this.cardSelection.startSelection({
            zones,
            selectionType: "zone",
            onSelectionCompleted: (cardZone: any) => {
                ygo.exec(new YGOCommands.NormalSummonCommand({
                    player,
                    id: card.id,
                    originZone,
                    zone: cardZone.zone
                }));
            }
        });
    }

    public setSummon({ card, originZone }: { card: Card, originZone: FieldZone }) {
        this.clearAction();

        const ygo = this.duel.ygo;
        const player = this.duel.getActivePlayer();
        const zones = getCardZones(this.duel, [card.owner], ["M"]);

        this.cardSelection.startSelection({
            zones,
            selectionType: "zone",
            onSelectionCompleted: (cardZone: any) => {
                ygo.exec(new YGOCommands.SetMonsterCommand({
                    player,
                    id: card.id,
                    originZone,
                    zone: cardZone.zone
                }));
            }
        });
    }

    public specialSummon({ card, originZone, position = "faceup-attack" }: { card: Card, originZone: FieldZone, position?: CardPosition }) {
        this.clearAction();

        const ygo = this.duel.ygo;
        const player = this.duel.getActivePlayer();
        const zones = getCardZones(this.duel, [card.owner], ["M"]);

        this.cardSelection.startSelection({
            zones,
            selectionType: "zone",
            onSelectionCompleted: (cardZone: any) => {
                ygo.exec(new YGOCommands.SpecialSummonCommand({
                    player,
                    id: card.id,
                    originZone,
                    zone: cardZone.zone,
                    position
                }));
            }
        });
    }

    public linkSummon({ card }: { card: Card }) {

        this.clearAction();
        const ygo = this.duel.ygo;
        const player = this.duel.getActivePlayer();
        const cardIndex = this.duel.ygo.state.fields[card.owner].extraDeck.findIndex((c) => c === card);
        const zones = getMonstersZones(this.duel, [card.owner]).filter(zone => YGOGameUtils.isFaceUp(zone.getCardReference()!));

        this.cardSelection.startMultipleSelection({
            zones,
            selectionType: "card",
            onSelectionCompleted: (cardZones: CardZone[]) => {

                const materials = cardZones.map(cardZone => {
                    return {
                        id: cardZone.getCardReference()!.id,
                        zone: cardZone.zone
                    }
                });

                const zonesToSummon = getCardZones(this.duel, [card.owner], ["M", "EMZ"]);
                cardZones.forEach(z => zonesToSummon.push(z));

                this.cardSelection.startSelection({
                    zones: zonesToSummon,
                    selectionType: "zone",
                    onSelectionCompleted: (cardZone: any) => {

                        ygo.exec(new YGOCommands.LinkSummonCommand({
                            player,
                            id: card.id,
                            materials,
                            originZone: YGOGameUtils.createZone("ED", card.owner, cardIndex + 1),
                            zone: cardZone.zone,
                        }));

                        this.clearAction();
                    }
                });

            }
        });
    }

    public xyzSummon({ card, position = "faceup-attack" }: { card: Card, position?: CardPosition }) {
        this.clearAction();
        const ygo = this.duel.ygo;
        const player = this.duel.getActivePlayer();
        const cardIndex = this.duel.ygo.state.fields[card.owner].extraDeck.findIndex((c) => c === card);
        const zones = getMonstersZones(this.duel, [card.owner]).filter(zone => YGOGameUtils.isFaceUp(zone.getCardReference()!));

        this.cardSelection.startMultipleSelection({
            zones,
            selectionType: "card",
            onSelectionCompleted: (cardZones: CardZone[]) => {

                const materials = cardZones.map(cardZone => {
                    return {
                        id: cardZone.getCardReference()!.id,
                        zone: cardZone.zone
                    }
                });

                const zonesToSummon = getCardZones(this.duel, [card.owner], ["M", "EMZ"]);
                cardZones.forEach(z => zonesToSummon.push(z));

                this.cardSelection.startSelection({
                    zones: zonesToSummon,
                    selectionType: "zone",
                    onSelectionCompleted: (cardZone: any) => {
                        ygo.exec(new YGOCommands.XYZSummonCommand({
                            player,
                            id: card.id,
                            materials,
                            originZone: YGOGameUtils.createZone("ED", card.owner, cardIndex + 1),
                            zone: cardZone.zone,
                            position
                        }));

                        this.clearAction();
                    }
                });

            }
        });
    }

    public synchroSummon({ card, position = "faceup-attack" }: { card: Card, position?: CardPosition }) {

        this.clearAction();

        const ygo = this.duel.ygo;
        const player = this.duel.getActivePlayer();
        const cardIndex = this.duel.ygo.state.fields[card.owner].extraDeck.findIndex((c) => c === card);
        const zones = getMonstersZones(this.duel, [card.owner]);

        this.cardSelection.startMultipleSelection({
            zones,
            selectionType: "card",
            onSelectionCompleted: (cardZones: CardZone[]) => {

                const materials = cardZones.map(cardZone => {
                    return {
                        id: cardZone.getCardReference()!.id,
                        zone: cardZone.zone
                    }
                });

                const zonesToSummon = getCardZones(this.duel, [card.owner], ["M", "EMZ"]);
                cardZones.forEach(z => zonesToSummon.push(z));

                this.cardSelection.startSelection({
                    zones: zonesToSummon,
                    selectionType: "zone",
                    onSelectionCompleted: (cardZone: any) => {

                        ygo.exec(new YGOCommands.SynchroSummonCommand({
                            player,
                            id: card.id,
                            materials,
                            originZone: YGOGameUtils.createZone("ED", card.owner, cardIndex + 1),
                            zone: cardZone.zone,
                            position
                        }));

                        this.clearAction();
                    }
                });

            }
        });
    }

    public fusionSummon({ card, position = "faceup-attack" }: { card: Card, position?: CardPosition }) {
        const ygo = this.duel.ygo;
        const player = this.duel.getActivePlayer();

        this.duel.events.publish("toggle-ui-menu", {
            group: "game-popup", type: "select-card-menu", data: {
                onSelectCards: (cards: CardZoneKV[]) => {

                    this.duel.events.publish("close-ui-menu", { type: "select-card-menu" });

                    const cardIndex = this.duel.ygo.state.fields[card.owner].extraDeck.findIndex((c) => c === card);

                    const materials = cards.map(cardData => {
                        return { id: cardData.card.id, zone: cardData.zone };
                    })

                    const zonesToSummon = getCardZones(this.duel, [card.owner], ["M", "EMZ"]);

                    materials.forEach(material => {
                        const zoneData = YGOGameUtils.getZoneData(material.zone);
                        if (zoneData.zone === "M") {
                            const cardZone = getGameZone(this.duel, zoneData)!;
                            zonesToSummon.push(cardZone);
                        }
                    });

                    this.cardSelection.startSelection({
                        zones: zonesToSummon,
                        selectionType: "zone",
                        onSelectionCompleted: (cardZone: any) => {

                            ygo.exec(new YGOCommands.FusionSummonCommand({
                                player,
                                id: card.id,
                                materials,
                                originZone: YGOGameUtils.createZone("ED", card.owner, cardIndex + 1),
                                zone: cardZone.zone,
                                position
                            }));

                            this.clearAction();
                        }
                    });
                }
            }
        });
    }

    public setCard({ card, originZone, zone, reveal = false, selectZone = true }: { card: Card, originZone: FieldZone, zone?: FieldZone, reveal?: boolean, selectZone?: boolean }) {
        this.clearAction();

        const ygo = this.duel.ygo;
        const player = this.duel.getActivePlayer();

        if (selectZone) {
            const zones = getCardZones(this.duel, [card.owner], ["S"]);

            this.cardSelection.startSelection({
                zones,
                selectionType: "zone",
                onSelectionCompleted: (cardZone: any) => {
                    ygo.exec(new YGOCommands.SetCardCommand({
                        player,
                        id: card.id,
                        originZone,
                        zone: cardZone.zone,
                        reveal
                    }));
                }
            });
        } else {
            ygo.exec(new YGOCommands.SetCardCommand({
                id: card.id,
                player,
                originZone,
                zone,
                reveal
            }));
        }
    }

    public activateCard({ card, originZone, selectZone = false }: { card: Card, originZone: FieldZone, selectZone?: boolean }) {
        this.clearAction();

        const ygo = this.duel.ygo;
        const player = this.duel.getActivePlayer();


        if (selectZone) {
            const zones = getCardZones(this.duel, [card.owner], ["S"]);

            this.cardSelection.startSelection({
                zones,
                selectionType: "zone",
                onSelectionCompleted: (cardZone: any) => {
                    ygo.exec(new YGOCommands.ActivateCardCommand({
                        player,
                        id: card.id,
                        originZone,
                        zone: cardZone.zone
                    }));
                }
            });
        } else {
            ygo.exec(new YGOCommands.ActivateCardCommand({
                player,
                id: card.id,
                zone: originZone
            }));
        }
    }

    public sendToGy({ card, originZone }: { card: Card, originZone: FieldZone }) {

        this.clearAction();

        this.duel.ygo.exec(new YGOCommands.SendCardToGYCommand({
            player: this.duel.getActivePlayer(),
            id: card.id,
            originZone,
        }));
    }

    public revealCard({ card, originZone }: { card: Card, originZone: FieldZone }) {
        this.clearAction();

        this.duel.ygo.exec(new YGOCommands.RevealCommand({
            player: this.duel.getActivePlayer(),
            id: card.id,
            originZone
        }));
    }

    public banish({ card, originZone, position = "faceup" }: { card: Card, originZone: FieldZone, position?: "faceup" | "facedown" }) {
        this.duel.ygo.exec(new YGOCommands.BanishCommand({
            player: this.duel.getActivePlayer(),
            id: card.id,
            originZone,
            position
        }));
    }

    public toST({ card, originZone }: { card: Card, originZone: FieldZone }) {
        this.clearAction();

        const ygo = this.duel.ygo;
        const player = this.duel.getActivePlayer();
        const zones = getCardZones(this.duel, [card.owner], ["S"]);

        this.cardSelection.startSelection({
            zones,
            selectionType: "zone",
            onSelectionCompleted: (cardZone: any) => {
                ygo.exec(new YGOCommands.ToSTCommand({
                    player,
                    id: card.id,
                    originZone,
                    zone: cardZone.zone
                }));
            }
        });
    }

    public fieldSpell({ card, originZone, position = "faceup" }: { card: Card, originZone: FieldZone, position?: "faceup" | "facedown" }) {
        this.clearAction();

        const ygo = this.duel.ygo;
        const player = this.duel.getActivePlayer();
        const cardZone = this.duel.fields[card.owner].fieldZone;

        ygo.exec(new YGOCommands.FieldSpellCommand({
            player,
            id: card.id,
            originZone,
            zone: cardZone.zone as ("F" | "F2"),
            position
        }));
    }

    public attachMaterial({ card, originZone }: { card: Card, originZone: FieldZone }) {
        this.clearAction();
        const ygo = this.duel.ygo;
        const player = this.duel.getActivePlayer();
        const xyzZones = getXyzMonstersZones(this.duel, [card.owner]);

        if (xyzZones.length === 0) return;

        this.cardSelection.startSelection({
            zones: xyzZones,
            selectionType: "zone",
            onSelectionCompleted: (cardZone: any) => {
                ygo.exec(new YGOCommands.XYZAttachMaterialCommand({
                    player,
                    id: card.id,
                    originZone,
                    zone: cardZone.zone
                }));
            }
        });
    }

    public toHand({ card, originZone }: { card: Card, originZone: FieldZone }) {
        this.clearAction();

        const ygo = this.duel.ygo;
        const player = this.duel.getActivePlayer();

        if (card.isMainDeckCard) {
            ygo.exec(new YGOCommands.ToHandCommand({
                player,
                id: card.id,
                originZone
            }));
        } else {
            this.toExtraDeck({ card, originZone });
        }

    }

    public toExtraDeck({ card, originZone }: { card: Card, originZone: FieldZone }) {
        this.clearAction();
        const ygo = this.duel.ygo;
        const player = this.duel.getActivePlayer();

        if (card.isMainDeckCard) {
            this.toHand({ card, originZone });
        } else {
            ygo.exec(new YGOCommands.ToExtraDeckCommand({
                player,
                id: card.id,
                originZone,
            }));
        }
    }

    public moveCard({ card, originZone }: { card: Card, originZone: FieldZone }) {
        this.clearAction();

        const ygo = this.duel.ygo;
        const player = this.duel.getActivePlayer();
        const zones = getCardZones(this.duel, [0, 1], ["M", "S"]).filter(c => c.zone !== originZone);

        this.cardSelection.startSelection({
            zones,
            selectionType: "zone",
            onSelectionCompleted: (cardZone: any) => {
                ygo.exec(new YGOCommands.MoveCardCommand({
                    player,
                    id: card.id,
                    originZone,
                    zone: cardZone.zone
                }));
            }
        });
    }

    public toDeck({ card, originZone, shuffle = false, position = "top" }: { card: Card, originZone: FieldZone, position: "top" | "bottom" | undefined, shuffle?: boolean }) {
        const ygo = this.duel.ygo;
        const player = this.duel.getActivePlayer();
        ygo.exec(new YGOCommands.ToDeckCommand({
            player,
            id: card.id,
            originZone,
            position,
            shuffle
        }));
    }


    public flip({ card, originZone }: { card: Card, originZone: FieldZone }) {
        const ygo = this.duel.ygo;
        const player = this.duel.getActivePlayer();
        ygo.exec(new YGOCommands.FlipCommand({
            player,
            id: card.id,
            originZone,
        }));
    }

    public changeBattlePosition({ card, originZone, position }: { card: Card, originZone: FieldZone, position: CardPosition }) {
        const ygo = this.duel.ygo;
        const player = this.duel.getActivePlayer();

        ygo.exec(new YGOCommands.ChangeCardPositionCommand({
            player,
            id: card.id,
            originZone,
            position,
        }));
    }

    public drawFromDeck({ player }: { player: number }) {
        this.duel.ygo.exec(new YGOCommands.DrawFromDeckCommand({ player }));
    }

    public milFromDeck({ player, numberOfCards = 1 }: { player: number, numberOfCards?: number }) {
        this.duel.ygo.exec(new YGOCommands.MillFromDeckCommand({ player, numberOfCards }));
    }
}