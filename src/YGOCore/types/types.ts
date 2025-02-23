import { BaseCommand } from "../commands/BaseCommand";
import { Command } from "./commands";
import { YGODuelEvents } from "./duel-events";

export const NUM_ZONES: number = 5; // Number of primary zones (Monster, Spell/Trap, etc.)
export type PlayerSide = 0 | 1 | number; // 0 represents Player 1, 1 represents Player 2

export type CardPosition = "faceup-attack" | "faceup-defense" | "faceup" | "facedown";

export type FieldZone = `M-${1 | 2 | 3 | 4 | 5}`
    | `M2-${1 | 2 | 3 | 4 | 5}`
    | `S-${1 | 2 | 3 | 4 | 5}`
    | `S2-${1 | 2 | 3 | 4 | 5}`
    | `EMZ`
    | `EMZ2`
    | `EMZ-${1 | 2}`
    | `EMZ2-${1 | 2}`
    | `ORU-${1 | 2 | 3 | 4 | 5}` // Overlay Units ORU Xyz Materials
    | `ORU2-${1 | 2 | 3 | 4 | 5}`
    | `ORUEMZ-${1 | 2}` // Xyz Materials in extra monster zone :)
    | `ORUEMZ2-${1 | 2}`
    | "H"
    | "H2"
    | `H-${number}`
    | `H2-${number}`
    | "F"
    | "F2"
    | "GY"
    | "GY2"
    | `GY-${number}`
    | `GY2-${number}`
    | "B"
    | "B2"
    | `B-${number}`
    | `B2-${number}`
    | "D"
    | "D2"
    | `D-${number}`
    | `D2-${number}`
    | "ED"
    | "ED2"
    | `ED-${number}`
    | `ED2-${number}`;

export type FieldZoneId = "M" | "S" | "EMZ" | "GY" | "D" | "ED" | "B" | "F" | "ORU" | "ORUEMZ" | "H";

export type FieldZoneData = { zone: FieldZoneId, player: number, zoneIndex: number }

export enum CardBaseType {
    NormalMonster,
    EffectMonster,
    RitualMonster,
    Spell,
    Trap,
    FusionMonster,
    SynchroMonster,
    XYZMonster,
    LinkMonster,
}

export interface YGOPropsOptions {
    lp?: number // default `8000`
    draw?: number // default `5`
    shuffleDecks?: boolean // default value is `true`,
    fieldState?: FileldStateEntry[] // default,
    startCommand?: number
    execCommands?: boolean
}

export interface YGOPropsPlayer {
    name: string,
    mainDeck: CardData[], // Card Data is the same as https://ygoprodeck.com/api-guide
    extraDeck: CardData[] // Card Data is the same as https://ygoprodeck.com/api-guide
}

export interface YGOProps {
    players: YGOPropsPlayer[],
    commands?: { type: string, data: any }[]
    options?: YGOPropsOptions
}

export interface FileldStateEntry {
    id: number,
    zone: FieldZone
    atk?: number
    def?: number
    owner?: number
    position?: CardPosition
    materials?: Array<{ id: number, owner?: number }>
}

export interface CardData {
    id: number
    name: string
    typeline: string[]
    type: string
    frameType: string
    desc: string,
    race: string,
    atk: number
    def: number
    level: number
    attribute: string
    card_images: any
}

export interface Card {
    id: number
    name: string
    typeline: string[]
    type: string
    frameType: string
    desc: string,
    race: string,
    atk: number
    def: number
    level: number
    linkval: number
    attribute: string
    card_images: any
    // game_data
    index: number // internal unique ID
    owner: number
    isMainDeckCard: boolean
    originalOwner: number
    position: CardPosition
    currentAtk: number
    currentDef: number
    materials: Card[]
}

export interface PlayerInfo {
    name: string;
}

export interface PlayerField {
    lp: number,
    player: PlayerInfo
    mainDeck: Card[]
    extraDeck: Card[]
    hand: Card[]
    data: {
        mainDeckOrdered: number[];
        extraDeckOrdered: number[];
    }
    graveyard: Card[]
    banishedZone: Card[]
    // Zones on the field where cards are actively played
    monsterZone: Array<Card | null>
    spellTrapZone: Array<Card | null>
    fieldZone: Card | null;
    extraMonsterZone: Array<Card | null>;
}

export interface GameState {
    players: PlayerInfo[];
    fields: PlayerField[];
}

export interface YGOReplayData {
    players: {
        name: string
        mainDeck: number[]
        extraDeck: number[]
    }[]
    initialField: FileldStateEntry[]
    endField: FileldStateEntry[]
    commands: any[]
}

export type YGOCoreEvents = {
    "command-created": (args: { command: Command }) => void
    "command-executed": (args: { command: Command }) => void
    "command-redo": (args: { command: Command }) => void
    "command-undo": (args: { command: Command }) => void
    'new-log': (log: YGODuelEvents.DuelLog) => void
    'update-logs': (logs: YGODuelEvents.DuelLog[]) => void
    'set-player': (args: { player: number }) => void
    'set-duel-phase': (args: { phase: YGOPhase }) => void
}

export enum YGOPhase {
    DrawPhase = "Draw Phase",
    StandbyPhase = "Standby Phase",
    MainPhase1 = "Main Phase 1",
    BattlePhase = "Battle Phase",
    MainPhase2 = "Main Phase 2",
    EndPhase = "End Phase",
}