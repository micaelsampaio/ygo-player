import { Card, CardBaseType, FieldZone, FieldZoneId, FieldZoneData, PlayerField } from "../types/types";
export declare class YGOGameUtils {
    static isLinkMonster(card: Card): boolean;
    static isMonster(card: Card): boolean;
    static isXYZMonster(card: Card): boolean;
    static isSynchroMonster(card: Card): boolean;
    static isFusionMonster(card: Card): boolean;
    static isPendulumCard(card: Card): boolean;
    static isFaceUp(card: Card): boolean;
    static isFaceDown(card: Card): boolean;
    static isSpellTrap(card: Card): boolean;
    static isSpell(card: Card): boolean;
    static isTrap(card: Card): boolean;
    static isFieldSpell(card: Card): boolean;
    static isDefense(card: Card): boolean;
    static isAttack(card: Card): boolean;
    static hasLinkMonstersInField(field: PlayerField): boolean;
    static hasXyzMonstersInField(field: PlayerField): boolean;
    static getPlayerIndexFromZone(zone: string): number;
    static createZone(zone: FieldZoneId, player: number, position?: number): FieldZone;
    static getZoneData(zone: FieldZone): FieldZoneData;
    static getCardBaseType(card: Card): CardBaseType;
    static getCardsBaseType(cards: Card[]): CardBaseType[];
    static toSortedCards(cards: Card[]): Card[];
    static sortCards(cardsToSort: Card[]): Card[];
    static shuffleCards(cards: Card[]): Array<number>;
}
