import { COMMANDS_BY_NAME } from "../commands";
import { Card, FieldZone, FileldStateEntry, PlayerField, YGOProps, YGOPropsPlayer } from "../types/types";
import { YGOCore } from "./YGOCore";
import { YGOGameUtils } from "./YGOGameUtils";

// Only internal functions for game utils
export class YGOUtils {
    static getPlayerIndexFromZone(zone: string): number {
        return YGOGameUtils.getPlayerIndexFromZone(zone);
    }

    static parseMainDeck({ mainDeck, player }: { mainDeck: Card[], player: number }): Card[] {
        return mainDeck.map(card => YGOUtils.parseCard({ card, player, isMainDeckCard: true }));
    }

    static parseExtraDeck({ extraDeck, player }: { extraDeck: Card[], player: number }): Card[] {
        const extra = extraDeck.map(card => YGOUtils.parseCard({ card, player, isMainDeckCard: false }));
        YGOGameUtils.sortCards(extra);
        return extra;
    }

    static parseCard({ card, player, isMainDeckCard }: { card: Card, player: number, isMainDeckCard: boolean }): Card {
        if (!card) throw new Error("card is required to be parsed");
        card.owner = player;
        card.originalOwner = player;
        card.materials = [];
        card.isMainDeckCard = isMainDeckCard;
        card.position = "facedown";
        return card;
    }

    static getCardsInGame(fields: PlayerField[]): Map<number, Card> {
        const cards = new Map<number, Card>()

        for (const field of fields) {

            for (const card of field.mainDeck) {
                if (!cards.has(card.id)) {
                    cards.set(card.id, card);
                }
            }

            for (const card of field.extraDeck) {
                if (!cards.has(card.id)) {
                    cards.set(card.id, card);
                }
            }
        }

        return cards;
    }

    static getOverlayZone(zone: FieldZone): FieldZone {
        const playerIndex = YGOUtils.getPlayerIndexFromZone(zone);
        const zoneIndex = zone.split("-")[1];

        if (zone.startsWith("EMZ")) {
            return `ORU${playerIndex === 0 ? '' : '2'}-${zoneIndex}` as FieldZone;
        }

        return `ORUEMZ${playerIndex === 0 ? '' : '2'}-${zoneIndex}` as FieldZone;
    }

    static initializePlayersFields(props: YGOProps): [PlayerField, PlayerField] {
        const { shuffleDecks = true } = props.options || {};
        let cardIndex = 0;

        const field1: PlayerField = {
            lp: 8000,
            player: { name: "test" },
            mainDeck: [],
            extraDeck: [],
            hand: [],
            data: {
                mainDeckOrdered: [],
                extraDeckOrdered: []
            },
            monsterZone: [null, null, null, null, null],
            spellTrapZone: [null, null, null, null, null],
            fieldZone: null,
            extraMonsterZone: [null, null],
            graveyard: [],
            banishedZone: [],
        };

        const field2: PlayerField = {
            lp: 8000,
            player: { name: "test2" },
            mainDeck: [],
            extraDeck: [],
            hand: [],
            data: {
                mainDeckOrdered: [],
                extraDeckOrdered: []
            },
            monsterZone: [null, null, null, null, null],
            spellTrapZone: [null, null, null, null, null],
            fieldZone: null,
            extraMonsterZone: [null, null],
            graveyard: [],
            banishedZone: [],
        }

        const fields: [PlayerField, PlayerField] = [field1, field2];

        for (let playerIndex = 0; playerIndex < props.players.length; ++playerIndex) {
            const player = props.players[playerIndex];
            const field = fields[playerIndex];
            field.mainDeck = YGOUtils.parseMainDeck({ mainDeck: player.mainDeck as Card[], player: playerIndex });
            field.extraDeck = YGOUtils.parseExtraDeck({ extraDeck: player.extraDeck as Card[], player: playerIndex });
            field.mainDeck.forEach(card => card.index = ++cardIndex);
            field.extraDeck.forEach(card => card.index = ++cardIndex);
        }

        if (shuffleDecks) {
            fields.forEach((field, playerIndex) => {
                if (props.players[playerIndex]) {
                    YGOGameUtils.shuffleCards(field.mainDeck);
                }
            });
        }

        fields.forEach((field) => {
            field.data.mainDeckOrdered = field.mainDeck.map(card => card.id);
            field.data.extraDeckOrdered = field.extraDeck.map(card => card.id);
        });

        this.recoverFields(fields, props.options?.fieldState);

        return fields;
    }

    private static recoverFields(fields: PlayerField[], fieldState: FileldStateEntry[] | undefined) {
        if (Array.isArray(fieldState)) {
            const cardsToRemoveFromDeck = [new Set(), new Set()];
            const cardsToRemoveFromExtraDeck = [new Set(), new Set()];

            const getCard = (player: number, id: number): Card => {

                const card = fields[player].mainDeck.find(c => c.id === id && !cardsToRemoveFromDeck[player].has(c));

                if (card) {
                    cardsToRemoveFromDeck[player].add(card);
                    return card;
                }

                const edCard = fields[player].extraDeck.find(c => c.id === id && !cardsToRemoveFromExtraDeck[player].has(c));

                if (edCard) {
                    cardsToRemoveFromExtraDeck[player].add(edCard);
                    return edCard;
                }

                throw new Error(`Card "${id}" not found in player "${player}" deck`);
            }

            for (let i = 0; i < 2; ++i) {
                const hand: Array<{ card: Card, index: number }> = [];
                const graveyard: Array<{ card: Card, index: number }> = [];
                const banished: Array<{ card: Card, index: number }> = [];

                for (const cardInitialState of fieldState) {
                    const zoneData = YGOGameUtils.getZoneData(cardInitialState.zone);

                    if (zoneData.player !== i) continue;

                    if (zoneData.zone === "H") {
                        const card = getCard(zoneData.player, cardInitialState.id); // TODO PLAYER OWNER CHECK
                        hand.push({ card, index: zoneData.zoneIndex || 0 });
                    } else if (zoneData.zone === "M") {
                        const { position = "faceup-attack" } = cardInitialState;
                        const card = getCard(zoneData.player, cardInitialState.id); // TODO PLAYER OWNER CHECK
                        fields[zoneData.player].monsterZone[zoneData.zoneIndex - 1] = card;

                        if (YGOUtils.isNumeric(cardInitialState.atk)) card.currentAtk = Number(cardInitialState.atk);
                        if (YGOUtils.isNumeric(cardInitialState.def)) card.currentDef = Number(cardInitialState.def);
                        if (position) card.position = position;
                        if (cardInitialState.materials) card.materials = cardInitialState.materials.map(({ id }) => getCard(zoneData.player, id)); // todo check owner
                    } else if (zoneData.zone === "EMZ") {
                        const card = getCard(zoneData.player, cardInitialState.id); // TODO PLAYER OWNER CHECK
                        fields[zoneData.player].extraMonsterZone[zoneData.zoneIndex - 1] = card;

                        if (YGOUtils.isNumeric(cardInitialState.atk)) card.currentAtk = Number(cardInitialState.atk);
                        if (YGOUtils.isNumeric(cardInitialState.def)) card.currentDef = Number(cardInitialState.def);
                        if (cardInitialState.position) card.position = cardInitialState.position;
                        if (cardInitialState.materials) card.materials = cardInitialState.materials.map(({ id }) => getCard(zoneData.player, id)); // todo check owner
                    }
                    else if (zoneData.zone === "S") {
                        const card = getCard(zoneData.player, cardInitialState.id); // TODO PLAYER OWNER CHECK
                        fields[zoneData.player].spellTrapZone[zoneData.zoneIndex - 1] = card;

                        if (cardInitialState.position) card.position = cardInitialState.position;
                    } else if (zoneData.zone === "F") {
                        const card = getCard(zoneData.player, cardInitialState.id); // TODO PLAYER OWNER CHECK
                        fields[zoneData.player].fieldZone = card;

                        if (cardInitialState.position) card.position = cardInitialState.position;
                    } else if (zoneData.zone === "GY") {
                        const card = getCard(zoneData.player, cardInitialState.id); // TODO PLAYER OWNER CHECK
                        graveyard.push({ card, index: zoneData.zoneIndex || 0 });
                    } else if (zoneData.zone === "B") {
                        const card = getCard(zoneData.player, cardInitialState.id); // TODO PLAYER OWNER CHECK
                        banished.push({ card, index: zoneData.zoneIndex || 0 });
                    } else if (zoneData.zone === "ED") { // pendulumns
                        // TODO
                    }
                };

                if (hand.length > 0) {
                    fields[i].hand = [...hand].sort((card1, card2) => card1.index - card2.index).map(cardInHand => cardInHand.card);
                }

                if (graveyard.length > 0) {
                    fields[i].graveyard = [...graveyard].sort((card1, card2) => card1.index - card2.index).map(cardInHand => cardInHand.card);
                }

                if (banished.length > 0) {
                    fields[i].hand = [...banished].sort((card1, card2) => card1.index - card2.index).map(cardInHand => cardInHand.card);
                }
            }

            for (let i = 0; i < fields.length; ++i) {
                fields[i].mainDeck = fields[i].mainDeck.filter(c => !cardsToRemoveFromDeck[i].has(c))
                fields[i].extraDeck = fields[i].extraDeck.filter(c => !cardsToRemoveFromDeck[i].has(c))
            }
        }
    }

    static isNumeric(val: any): boolean {
        return !isNaN(Number(val));
    }

    static getFieldsAsString(ygo: YGOCore) {
        const log: string[] = [];

        log.push("---- FIELD STATE ----");

        const field1 = ygo.getField(0);
        const field2 = ygo.getField(1);

        log.push("Player2: " + field1.player.name);
        log.push("Hand: " + field2.hand.map(c => c.name).join(" | "));
        log.push("Spell/Trap Zone: " + field2.spellTrapZone.map(c => c?.name || "_").join(" | "));
        log.push("Monster Zone: " + field2.monsterZone.map(c => c?.name || "_").join(" | "));
        log.push("-------");
        log.push("Extra Monster Zone: " + ((field1.extraMonsterZone[0] || field2.extraMonsterZone[0])?.name || "_") + " | " + ((field1.extraMonsterZone[1] || field2.extraMonsterZone[1])?.name || "_"));
        log.push("-------");
        log.push("Monster Zone: " + field1.monsterZone.map(c => c?.name || "_").join(" | "));
        log.push("Spell/Trap Zone: " + field1.spellTrapZone.map(c => c?.name || "_").join(" | "));
        log.push("Hand: " + field1.hand.map(c => c.name).join(" | "));
        log.push("Player1: " + field1.player.name);

        return log.join("\n");
    }

    static getYGOCoreStateProps(ygo: YGOCore): YGOProps {

        const players: YGOPropsPlayer[] = ygo.state.fields.map((field) => {
            return {
                name: field.player.name,
                mainDeck: field.data.mainDeckOrdered.map(id => ygo.state.getCardData(id) as any),
                extraDeck: field.data.extraDeckOrdered.map(id => ygo.state.getCardData(id) as any),
            }
        });

        return {
            players,
            commands: ygo.commands.map(cmd => cmd.toJSON()),
            options: {
                startCommand: ygo.commandIndex,
                ...ygo.props.options || {},
                shuffleDecks: false,
                execCommands: true
            }
        }
    }

}