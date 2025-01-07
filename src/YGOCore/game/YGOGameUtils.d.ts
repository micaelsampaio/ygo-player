import { Card, CardBaseType, FieldZone, FieldZoneId, PlayerField } from "../types/types";
export declare class YGOGameUtils {
    static isLinkMonster(card: Card): boolean;
    static isXYZMonter(card: Card): boolean;
    static isPendulumCard(card: Card): boolean;
    static isFaceUp(card: Card): boolean;
    static isFaceDown(card: Card): boolean;
    static hasLinkMonstersInField(field: PlayerField): boolean;
    static hasXyzMonstersInField(field: PlayerField): boolean;
    static getPlayerIndexFromZone(zone: string): (0 | 1);
    static createZone(zone: FieldZoneId, player: number, position?: number): FieldZone;
    static getZoneInfo(zone: FieldZone): {
        zone: FieldZoneId;
        player: 0 | 1;
        zonePosition: number | null;
    };
    static getCardBaseType(card: Card): CardBaseType;
    static getCardsBaseType(cards: Card[]): CardBaseType[];
    static toSortedCards(cards: Card[]): Card[];
    static sortCards(cardsToSort: Card[]): Card[];
    static shuffleCards(cards: Card[]): Array<number>;
}
