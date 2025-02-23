import { CardPosition, FieldZone } from "./types";

export namespace YGODuelEvents {
    export enum LogType {
        NormalSummon = "Normal Summon",
        SetMonster = "Set Monster",
        SendToGY = "Send To GY",
        Banish = "Banish",
        BanishFD = "Banish FD",
        StartHand = "Start Hand",
        DrawCardFromDeck = "Draw From Deck",
        MillCardFromDeck = "Mill From Deck",
        TributeSummon = "Tribute Summon",
        TributeSet = "Tribute Set",
        ToHand = "To Hand",
        ToExtraDeck = "To Extra Deck",
        ToTopDeck = "To Top Deck",
        ToBottomDeck = "To Bottom Deck",
        SpecialSummon = "Special Summon",
        SynchroSummon = "Synchro Summon",
        LinkSummon = "Link Summon",
        FusionSummon = "Fusion Summon",
        XYZSummon = "XYZ Summon",
        XYZAttachMaterial = "XYZ Attach Material",
        XYZDetachMaterial = "XYZ Detach Material",
        XYZOverlay = "XYZOverlay",
        SetST = "Set ST",
        Activate = "Activate",
        MoveCard = "Move Card",
        Shuffle = "Shuffle",
        ToST = "To ST",
        Reveal = "Reveal",
        Target = "Target",
        FieldSpell = "Field Spell",
        ChangeCardPosition = "Change Card Position",
        ChangeCardAtkDef = "Change Card Atk Def",
        Flip = "Flip"
    }

    export interface DuelLog {
        type: LogType;
        player: number;
        commandId: number;
    }

    export interface NormalSummon extends DuelLog {
        id: number;
        originZone: FieldZone;
        zone: FieldZone;
        position: CardPosition;
    }

    export interface MoveCard extends DuelLog {
        id: number;
        originZone: FieldZone;
        zone: FieldZone;
        position: CardPosition;
    }

    export interface ToHand extends MoveCard { }

    export interface SetMonster extends DuelLog {
        id: number;
        originZone: FieldZone;
        zone?: FieldZone;
    }

    export interface SetST extends DuelLog {
        id: number;
        originZone: FieldZone;
        zone?: FieldZone;
    }

    export interface SendToGY extends DuelLog {
        id: number
        originZone: FieldZone
        zone: FieldZone,
        reason?: "Fusion Summon" | "Synchro Summon" | "Link Summon" | "XYZ Material" | undefined
    }

    export interface DrawFromDeck extends DuelLog {
        id: number
        originZone: FieldZone
        zone: FieldZone
    }

    export interface StartHand extends DuelLog {
        cards: { id: number, zone: FieldZone }[],
        core: boolean
    }

    export interface FusionSummon extends DuelLog {
        id: number
        originZone: FieldZone
        zone: FieldZone
        position: CardPosition
        materials: Array<{
            id: number
            zone: FieldZone
            owner: number
        }>
    }

    export interface SynchroSummon extends DuelLog {
        id: number
        originZone: FieldZone
        zone: FieldZone
        position: CardPosition
        materials: Array<{
            id: number
            zone: FieldZone
        }>
    }

    export interface LinkSummon extends DuelLog {
        id: number
        originZone: FieldZone
        zone: FieldZone
        materials: Array<{
            id: number
            zone: FieldZone
            owner: number
        }>
    }

    export interface XYZSummon extends DuelLog {
        id: number
        originZone: FieldZone
        zone: FieldZone
        position: CardPosition
        materials: Array<{
            id: number
            zone: FieldZone
        }>
    }

    export interface XYZAttach extends DuelLog {
        id: number
        originZone: FieldZone
        overlayZone: FieldZone
    }

    export interface XYZOverlay extends DuelLog {
        id: number
        originZone: FieldZone
        overlayZone: FieldZone
    }

    export interface XYZDetach extends DuelLog {
        id: number
        overlayZone: FieldZone
        materialIndex: number
    }

    export interface Activate extends DuelLog {
        id: number
        originZone?: FieldZone
        zone: FieldZone
        previousPosition: CardPosition
        position: CardPosition
    }

    export interface Target extends DuelLog {
        id: number
        originZone: FieldZone
    }

    export interface Banish extends DuelLog {
        id: number;
        originZone: FieldZone;
        zone: FieldZone;
        position: CardPosition;
    }

    export interface Shuffle extends DuelLog { }

    export interface Reveal extends DuelLog {
        id: number;
        originZone: FieldZone;
    }

    export interface ChangeCardPosition extends DuelLog {
        id: number
        originZone: FieldZone
        previousPosition: CardPosition
        position: CardPosition
    }

    export interface ChangeCardAtkDef extends DuelLog {
        id: number;
        zone: FieldZone;
        atk: number | null
        def: number | null
    }

    export interface Flip extends DuelLog {
        id: number
        originZone: FieldZone
        previousPosition: CardPosition
        position: CardPosition
    }

    export interface ToExtraDeck extends DuelLog {
        id: number,
        originZone: FieldZone
    }

    export interface MillCardFromDeck extends DuelLog {
        // TODO
    }
}

