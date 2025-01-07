import { Card, FieldZone, PlayerField, YGOProps } from "../types/types";
export declare class YGOGameState {
    fields: PlayerField[];
    private cardsInGame;
    constructor(props: YGOProps);
    getCardById(id: number, zone: FieldZone): Card;
    getCardFromZone(zone: FieldZone): Card | null;
    moveCardById(cardId: number, originZone: FieldZone, zone: FieldZone): void;
    moveCard(card: Card, originZone: FieldZone, zone: FieldZone): void;
    setCard(card: Card | null, zone: FieldZone): void;
    removeCard(zone: FieldZone): Card | null;
    getCardData(cardId: number): Card | null;
    shuffleDeck(player: number): void;
    getPlayerIndexFromZone(zone: string): 0 | 1;
    getAvailableZones(fieldZones: ("M" | "M2" | "S" | "S2" | "F" | "F2" | "EMZ")[]): FieldZone[];
}
