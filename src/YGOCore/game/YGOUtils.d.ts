import { Card, FieldZone, PlayerField, YGOProps } from "../types/types";
import { YGOCore } from "./YGOCore";
export declare class YGOUtils {
    static getPlayerIndexFromZone(zone: string): number;
    static parseMainDeck({ mainDeck, player }: {
        mainDeck: Card[];
        player: number;
    }): Card[];
    static parseExtraDeck({ extraDeck, player }: {
        extraDeck: Card[];
        player: number;
    }): Card[];
    static parseCard({ card, player, isMainDeckCard }: {
        card: Card;
        player: number;
        isMainDeckCard: boolean;
    }): Card;
    static getCardsInGame(fields: PlayerField[]): Map<number, Card>;
    static getOverlayZone(zone: FieldZone): FieldZone;
    static initializePlayersFields(props: YGOProps): [PlayerField, PlayerField];
    private static recoverFields;
    static isNumeric(val: any): boolean;
    static getFieldsAsString(ygo: YGOCore): string;
}
