import { CardPosition, FieldZone } from "./types";
export declare namespace YGODuelEvents {
    enum LogType {
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
    interface DuelLog {
        type: LogType;
        player: number;
        commandId: number;
    }
    interface NormalSummon extends DuelLog {
        id: number;
        originZone: FieldZone;
        zone: FieldZone;
        position: CardPosition;
    }
    interface MoveCard extends DuelLog {
        id: number;
        originZone: FieldZone;
        zone: FieldZone;
        position: CardPosition;
    }
    interface ToHand extends MoveCard {
    }
    interface SetMonster extends DuelLog {
        id: number;
        originZone: FieldZone;
        zone?: FieldZone;
    }
    interface SetST extends DuelLog {
        id: number;
        originZone: FieldZone;
        zone?: FieldZone;
    }
    interface SendToGY extends DuelLog {
        id: number;
        originZone: FieldZone;
        zone: FieldZone;
        reason?: "Fusion Summon" | "Synchro Summon" | "Link Summon" | "XYZ Material" | undefined;
    }
    interface DrawFromDeck extends DuelLog {
        id: number;
        originZone: FieldZone;
        zone: FieldZone;
    }
    interface StartHand extends DuelLog {
        cards: {
            id: number;
            zone: FieldZone;
        }[];
        core: boolean;
    }
    interface FusionSummon extends DuelLog {
        id: number;
        originZone: FieldZone;
        zone: FieldZone;
        position: CardPosition;
        materials: Array<{
            id: number;
            zone: FieldZone;
            owner: number;
        }>;
    }
    interface SynchroSummon extends DuelLog {
        id: number;
        originZone: FieldZone;
        zone: FieldZone;
        position: CardPosition;
        materials: Array<{
            id: number;
            zone: FieldZone;
        }>;
    }
    interface LinkSummon extends DuelLog {
        id: number;
        originZone: FieldZone;
        zone: FieldZone;
        materials: Array<{
            id: number;
            zone: FieldZone;
            owner: number;
        }>;
    }
    interface XYZSummon extends DuelLog {
        id: number;
        originZone: FieldZone;
        zone: FieldZone;
        position: CardPosition;
        materials: Array<{
            id: number;
            zone: FieldZone;
        }>;
    }
    interface XYZAttach extends DuelLog {
        id: number;
        originZone: FieldZone;
        overlayZone: FieldZone;
    }
    interface XYZOverlay extends DuelLog {
        id: number;
        originZone: FieldZone;
        overlayZone: FieldZone;
    }
    interface XYZDetach extends DuelLog {
        id: number;
        overlayZone: FieldZone;
        materialIndex: number;
    }
    interface Activate extends DuelLog {
        id: number;
        originZone?: FieldZone;
        zone: FieldZone;
        previousPosition: CardPosition;
        position: CardPosition;
    }
    interface Target extends DuelLog {
        id: number;
        originZone: FieldZone;
    }
    interface Banish extends DuelLog {
        id: number;
        originZone: FieldZone;
        zone: FieldZone;
        position: CardPosition;
    }
    interface Shuffle extends DuelLog {
    }
    interface Reveal extends DuelLog {
        id: number;
        originZone: FieldZone;
    }
    interface ChangeCardPosition extends DuelLog {
        id: number;
        originZone: FieldZone;
        previousPosition: CardPosition;
        position: CardPosition;
    }
    interface ChangeCardAtkDef extends DuelLog {
        id: number;
        zone: FieldZone;
        atk: number | null;
        def: number | null;
    }
    interface Flip extends DuelLog {
        id: number;
        originZone: FieldZone;
        previousPosition: CardPosition;
        position: CardPosition;
    }
    interface ToExtraDeck extends DuelLog {
        id: number;
        originZone: FieldZone;
    }
    interface MillCardFromDeck extends DuelLog {
    }
}
