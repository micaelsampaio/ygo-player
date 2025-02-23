import { Card, FieldZone, FileldStateEntry, PlayerField, YGOProps } from "../types/types";
import { YGOGameUtils } from "./YGOGameUtils";
import { YGOUtils } from "./YGOUtils";

export class YGOGameState {
    public fields: PlayerField[];
    private cardsInGame: Map<number, Card>;

    constructor(props: YGOProps) {
        this.fields = YGOUtils.initializePlayersFields(props);
        this.cardsInGame = YGOUtils.getCardsInGame(this.fields);
    }

    getCardById(id: number, zone: FieldZone): Card {
        const playerIndex = zone.includes("2-") ? 1 : 0;

        if (zone === "GY" || zone === "GY2") {
            const card = this.fields[playerIndex].graveyard.find(c => c.id === id);

            if (!card) {
                throw new Error(`card "${id}" not found in "${zone}"`);
            }

            return card;
        }

        const card = this.getCardFromZone(zone);

        if (card && card.id === id) return card;

        throw new Error(`card "${id}" not found in "${zone}"`);
    }

    getCardFromZone(zone: FieldZone): Card | null {
        const playerIndex = zone.includes("2-") ? 1 : 0;

        if (zone.startsWith("H-") || zone.startsWith("H2-")) {
            const zoneIndex = Number(zone.split("-").pop()) - 1;
            const card = this.fields[playerIndex].hand[zoneIndex];
            return card;
        } else if (zone.startsWith("M-") || zone.startsWith("M2-")) {
            const zoneIndex = Number(zone.split("-").pop()) - 1;
            const card = this.fields[playerIndex].monsterZone[zoneIndex];
            return card;
        } else if (zone.startsWith("S-") || zone.startsWith("S2-")) {
            const zoneIndex = Number(zone.split("-").pop()) - 1;
            const card = this.fields[playerIndex].spellTrapZone[zoneIndex];
            return card;
        } else if (zone.startsWith("GY-") || zone.startsWith("GY2-")) {
            const zoneIndex = Number(zone.split("-").pop()) - 1;
            const card = this.fields[playerIndex].graveyard[zoneIndex];
            return card;
        } else if (zone.startsWith("B-") || zone.startsWith("B2-")) {
            const zoneIndex = Number(zone.split("-").pop()) - 1;
            const card = this.fields[playerIndex].banishedZone[zoneIndex];
            return card;
        } else if (zone.startsWith("D-") || zone.startsWith("D2-")) {
            const zoneIndex = Number(zone.split("-").pop()) - 1;
            const card = this.fields[playerIndex].mainDeck[zoneIndex];
            return card;
        } else if (zone.startsWith("ED-") || zone.startsWith("ED2-")) {
            const zoneIndex = Number(zone.split("-").pop()) - 1;
            const card = this.fields[playerIndex].extraDeck[zoneIndex];
            return card;
        } else if (zone.startsWith("EMZ-") || zone.startsWith("EMZ2-")) {
            const zoneIndex = Number(zone.split("-").pop()) - 1;
            const card = this.fields[playerIndex].extraMonsterZone[zoneIndex];
            return card;
        } else if (zone.startsWith("F") || zone.startsWith("F2")) {
            const card = this.fields[playerIndex].fieldZone;
            return card;
        }

        return null;
    }

    moveCardById(cardId: number, originZone: FieldZone, zone: FieldZone) {
        const card = this.getCardById(cardId, originZone);
        this.moveCard(card, originZone, zone);
    }

    moveCard(card: Card, originZone: FieldZone, zone: FieldZone) {
        this.removeCard(originZone);
        this.setCard(card, zone);
    }

    setCard(card: Card | null, zone: FieldZone): void {
        const playerIndex = zone.includes("2-") ? 1 : 0;

        if (zone.startsWith("H-") || zone.startsWith("H2-") || zone === "H" || zone === "H2") {
            const handIndex = zone.includes("-") ? Number(zone.split("-").pop()) - 1 : -1;
            const hand = this.fields[playerIndex].hand;

            if (handIndex == -1 && card) {
                hand.push(card);
            } else if (card) {
                if (handIndex >= hand.length) {
                    hand.push(card);
                } else {
                    hand.splice(handIndex, 0, card);
                }
            } else {
                hand.splice(handIndex, 1);
            }
        } else if (zone.startsWith("M-") || zone.startsWith("M2-")) {
            const zoneIndex = Number(zone.split("-").pop()) - 1;
            this.fields[playerIndex].monsterZone[zoneIndex] = card;
            // todo check if monster etc 
        } else if (zone.startsWith("S-") || zone.startsWith("S2-")) {
            const zoneIndex = Number(zone.split("-").pop()) - 1;
            this.fields[playerIndex].spellTrapZone[zoneIndex] = card;
        } else if (zone.startsWith("EMZ-") || zone.startsWith("EMZ2-")) {
            const zoneIndex = Number(zone.split("-").pop()) - 1;
            this.fields[playerIndex].extraMonsterZone[zoneIndex] = card;
        }
        else if (zone.startsWith("ED") || zone.startsWith("ED2")) { // append to extra
            if (zone.indexOf("-") !== -1) {
                console.log("ZONE ", zone);
                console.log("ED ", this.fields[playerIndex].extraDeck);
                const zoneIndex = Number(zone.split("-").pop()) - 1;
                if (!card) {
                    this.fields[playerIndex].extraDeck.splice(zoneIndex, 1);
                } else {
                    this.fields[playerIndex].extraDeck.splice(zoneIndex, 0, card);
                }
            } else if (card) {
                const isPendulum = card.isMainDeckCard && YGOGameUtils.isPendulumCard(card);
                const extraDeck = this.fields[playerIndex].extraDeck;

                if (isPendulum) {
                    extraDeck.unshift(card); // add card to top of extraDeck
                } else {
                    extraDeck.push(card);
                    YGOGameUtils.sortCards(extraDeck);
                }
            } else {
                throw new Error("No card to add to Extra Deck");
            }
        } else if (zone.startsWith("D-") || zone.startsWith("D2-")) {
            const zoneIndex = Number(zone.split("-").pop()) - 1;

            console.log("MOVE CARD TO DECK ", zone);

            if (!card) {
                this.fields[playerIndex].mainDeck.splice(zoneIndex, 1);
            } else {
                this.fields[playerIndex].mainDeck.splice(zoneIndex, 0, card);
            }
        } else if (zone === "GY" || zone === "GY2" || zone.startsWith("GY-") || zone.startsWith("GY2-")) {
            const gyIndex = zone.includes("-") ? Number(zone.split("-").pop()) - 1 : -1;
            const gy = this.fields[playerIndex].graveyard;

            if (card) {
                if (gyIndex === -1) {
                    gy.unshift(card);
                } else {
                    gy.splice(gyIndex, 0, card);
                }
            } else {
                if (gyIndex == -1) {
                    gy.pop();
                } else {
                    gy.splice(gyIndex, 1);
                }
            }
        } else if (zone === "B" || zone === "B2" || zone.startsWith("B-") || zone.startsWith("B2-")) {
            const gyIndex = zone.includes("-") ? Number(zone.split("-").pop()) - 1 : -1;
            const banishZone = this.fields[playerIndex].banishedZone;

            if (card) {
                if (gyIndex === -1) {
                    banishZone.unshift(card);
                } else {
                    banishZone.splice(gyIndex, 0, card);
                }
            } else {
                if (gyIndex == -1) {
                    banishZone.pop();
                } else {
                    banishZone.splice(gyIndex, 1);
                }
            }
        } else if (zone.startsWith("F") || zone.startsWith("F2")) {
            this.fields[playerIndex].fieldZone = card;
        }
    }

    removeCard(zone: FieldZone): Card | null {
        const card = this.getCardFromZone(zone);
        this.setCard(null, zone);
        // TODO Reset card
        return card;
    }

    getCardData(cardId: number): Card | null {
        return this.cardsInGame.get(cardId) || null;
    }

    shuffleDeck(player: number) {
        const deck = this.fields[player].mainDeck;
        if (deck.length === 0) return; // If the deck is empty, do nothing

        for (let i = deck.length - 1; i > 0; i--) {
            const cardIndex = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[cardIndex]] = [deck[cardIndex], deck[i]];
        }
    }

    getPlayerIndexFromZone(zone: string): number {
        return YGOUtils.getPlayerIndexFromZone(zone);
    }

    getAvailableZones(fieldZones: ("M" | "M2" | "S" | "S2" | "F" | "F2" | "EMZ")[]): FieldZone[] {
        const result: FieldZone[] = [];

        // TODO @RMS  make this player aware

        for (const fieldZone of fieldZones) {
            const player = this.getPlayerIndexFromZone(fieldZone);
            const field = this.fields[player];
            if (fieldZone === "M") {
                field.monsterZone.forEach((data, index) => {
                    const zone = `M${player === 0 ? "" : "2"}-${index + 1}`;
                    if (!data) result.push(zone as FieldZone);
                });
            } else if (fieldZone === "S") {
                field.spellTrapZone.forEach((data, index) => {
                    const zone = `S${player === 0 ? "" : "2"}-${index + 1}`;
                    if (!data) result.push(zone as FieldZone);
                });
            } else if (fieldZone === "EMZ") {
                for (let i = 0; i < 2; ++i) {
                    const data = field.extraDeck[i] || field.extraDeck[i];
                    const zone = `EMZ-${i + 1}`;
                    if (!data) result.push(zone as FieldZone);
                }
            } else if (fieldZone === "F") {
                if (field.fieldZone) result.push("F");
            }
        }

        return result;
    }
}