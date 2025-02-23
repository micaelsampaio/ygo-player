import { Card, CardBaseType, FieldZone, FieldZoneId, FieldZoneData, PlayerField } from "../types/types";

// Only functions for game utils
export class YGOGameUtils {

    static isLinkMonster(card: Card): boolean {
        return card.typeline?.includes("Link");
    }

    static isMonster(card: Card): boolean {
        return card.type?.includes("Monster");
    }

    static isXYZMonster(card: Card) {
        return card.typeline?.includes("Xyz");
    }

    static isSynchroMonster(card: Card) {
        return card.typeline?.includes("Synchro");
    }

    static isFusionMonster(card: Card) {
        return card.typeline?.includes("Fusion");
    }

    static isPendulumCard(card: Card) {
        return card.frameType?.includes("pendulum");
    }

    static isFaceUp(card: Card): boolean {
        return card.position.includes("faceup");
    }

    static isFaceDown(card: Card): boolean {
        return !this.isFaceUp(card);
    }

    static isSpellTrap(card: Card) {
        return this.isSpell(card) || this.isTrap(card);
    }

    static isSpell(card: Card) {
        return card.frameType.startsWith("spell");
    }

    static isTrap(card: Card) {
        return card.frameType.startsWith("trap");
    }

    static isFieldSpell(card: Card) {
        return card.race === "Field";
    }

    static isDefense(card: Card) {
        return card.position === "facedown" || card.position === "faceup-defense";
    }

    static isAttack(card: Card) {
        return card.position === "faceup-attack" || card.position === "faceup";
    }

    static hasLinkMonstersInField(field: PlayerField) {

        if (field.monsterZone.some(card => card ? YGOGameUtils.isLinkMonster(card) : false)) {
            return true;
        }

        return field.extraMonsterZone.some(card => card ? YGOGameUtils.isLinkMonster(card) : false);
    }

    static hasXyzMonstersInField(field: PlayerField) {

        if (field.monsterZone.some(card => card ? YGOGameUtils.isXYZMonster(card) : false)) {
            return true;
        }

        return field.extraMonsterZone.some(card => card ? YGOGameUtils.isXYZMonster(card) : false);
    }

    static getPlayerIndexFromZone(zone: string): number {
        const isPlayer2 = zone.includes("2-");

        if (isPlayer2) return 1;

        switch (zone) {
            case "M2":
            case "H2":
            case "F2":
            case "GY2":
            case "EMZ2-1":
            case "EMZ2-2":
                return 1;
            default:
                return 0;
        }
    }

    static createZone(zone: FieldZoneId, player: number, position?: number): FieldZone {

        if (position === undefined) {
            return `${zone}${player === 0 ? '' : '2'}` as FieldZone;
        }

        return `${zone}${player === 0 ? '' : '2'}-${position}` as FieldZone;
    }

    static getZoneData(zone: FieldZone): FieldZoneData {
        const args = zone.split("-");
        let playerIndex = 0;
        let zoneId = args[0];
        const zoneIndex = args.length > 1 ? Number(args[1]) : -1;

        if (args[0].endsWith("2")) {
            playerIndex = 1;
            zoneId = zoneId.substring(0, zoneId.length - 1);
        }

        return {
            zone: zoneId as FieldZoneId,
            player: playerIndex,
            zoneIndex: zoneIndex,
        }
    }

    static getCardBaseType(card: Card): CardBaseType {
        if (card.frameType.startsWith("effect")) return CardBaseType.EffectMonster;
        if (card.frameType.startsWith("spell")) return CardBaseType.Spell;
        if (card.frameType.startsWith("ritual")) return CardBaseType.RitualMonster;
        if (card.frameType.startsWith("trap")) return CardBaseType.Trap;
        if (card.frameType.includes("fusion")) return CardBaseType.FusionMonster;
        if (card.frameType.includes("synchro")) return CardBaseType.SynchroMonster;
        if (card.frameType.includes("xyz")) return CardBaseType.XYZMonster;
        if (card.frameType.includes("link")) return CardBaseType.LinkMonster;
        return CardBaseType.NormalMonster;
    }

    static getCardsBaseType(cards: Card[]): CardBaseType[] {
        const result = cards.map(c => YGOGameUtils.getCardBaseType(c));
        return result;
    }

    static toSortedCards(cards: Card[]) {
        return this.sortCards([...cards]);
    }

    static sortCards(cardsToSort: Card[]) {
        const cards = cardsToSort;
        const cardsWeights = YGOGameUtils.getCardsBaseType(cards);

        for (let i = 0; i < cards.length - 1; ++i) {
            for (let j = 0; j < cards.length - i - 1; ++j) {
                if (cardsWeights[j] > cardsWeights[j + 1] || (cardsWeights[j] === cardsWeights[j + 1] && cards[j].name > cards[j + 1].name)) {
                    [cards[j], cards[j + 1]] = [cards[j + 1], cards[j]];
                    [cardsWeights[j], cardsWeights[j + 1]] = [cardsWeights[j + 1], cardsWeights[j]];
                }
            }
        }

        return cards;
    }

    static shuffleCards(cards: Card[]): Array<number> {
        const positions = Array<number>(cards.length);
        for (let i = 0; i < cards.length; ++i) {
            const index = Math.floor(Math.random() * cards.length);

            positions[i] = index;

            const temp = cards[i];
            cards[i] = cards[index];
            cards[index] = temp;
        }
        return positions;
    }

    static invertPlayerInZone(zone: FieldZone): FieldZone {
        const zoneData = this.getZoneData(zone);
        return this.createZone(zoneData.zone, 1 - zoneData.player, zoneData.zoneIndex);
    }
}