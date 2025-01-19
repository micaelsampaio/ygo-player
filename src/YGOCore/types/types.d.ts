export declare const NUM_ZONES: number;
export type PlayerSide = 0 | 1 | number;
export type CardPosition = "faceup-attack" | "faceup-defense" | "faceup" | "facedown";
export type FieldZone = `M-${1 | 2 | 3 | 4 | 5}` | `M2-${1 | 2 | 3 | 4 | 5}` | `S-${1 | 2 | 3 | 4 | 5}` | `S2-${1 | 2 | 3 | 4 | 5}` | `EMZ` | `EMZ2` | `EMZ-${1 | 2}` | `EMZ2-${1 | 2}` | `ORU-${1 | 2 | 3 | 4 | 5}` | `ORU2-${1 | 2 | 3 | 4 | 5}` | `ORUEMZ-${1 | 2}` | `ORUEMZ2-${1 | 2}` | "H" | "H2" | `H-${number}` | `H2-${number}` | "F" | "F2" | "GY" | "GY2" | `GY-${number}` | `GY2-${number}` | "B" | "B2" | `B-${number}` | `B2-${number}` | "D" | "D2" | `D-${number}` | `D2-${number}` | "ED" | "ED2" | `ED-${number}` | `ED2-${number}`;
export type FieldZoneId = "M" | "S" | "EMZ" | "GY" | "D" | "ED" | "B" | "F" | "ORU" | "ORUEMZ" | "H";
export type FieldZoneData = {
    zone: FieldZoneId;
    player: number;
    zoneIndex: number;
};
export declare enum CardBaseType {
    NormalMonster = 0,
    EffectMonster = 1,
    RitualMonster = 2,
    Spell = 3,
    Trap = 4,
    FusionMonster = 5,
    SynchroMonster = 6,
    XYZMonster = 7,
    LinkMonster = 8
}
export interface YGOProps {
    players: {
        name: string;
        mainDeck: CardData[];
        extraDeck: CardData[];
        mainDeckOrder?: number[];
    }[];
    commands?: {
        type: string;
        data: any;
    }[];
    options?: {
        lp?: number;
        draw?: number;
        shuffleDecks?: boolean;
        fieldState?: FileldStateEntry[][];
    };
}
export interface FileldStateEntry {
    id: number;
    zone: FieldZone;
    atk?: number;
    def?: number;
    owner?: number;
    position?: CardPosition;
    materials?: Array<{
        id: number;
        owner?: number;
    }>;
}
export interface CardData {
    id: number;
    name: string;
    typeline: string[];
    type: string;
    frameType: string;
    desc: string;
    race: string;
    atk: number;
    def: number;
    level: number;
    attribute: string;
    card_images: any;
}
export interface Card {
    id: number;
    name: string;
    typeline: string[];
    type: string;
    frameType: string;
    desc: string;
    race: string;
    atk: number;
    def: number;
    level: number;
    linkval: number;
    attribute: string;
    card_images: any;
    index: number;
    owner: number;
    isMainDeckCard: boolean;
    originalOwner: number;
    position: CardPosition;
    currentAtk: number;
    currentDef: number;
    materials: Card[];
}
export interface PlayerInfo {
    name: string;
}
export interface PlayerField {
    lp: number;
    player: PlayerInfo;
    mainDeck: Card[];
    extraDeck: Card[];
    hand: Card[];
    initialMainDeckOrder: number[];
    graveyard: Card[];
    banishedZone: Card[];
    monsterZone: Array<Card | null>;
    spellTrapZone: Array<Card | null>;
    fieldZone: Card | null;
    extraMonsterZone: Array<Card | null>;
}
export interface GameState {
    players: PlayerInfo[];
    fields: PlayerField[];
}
