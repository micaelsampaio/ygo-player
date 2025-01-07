import { CardPosition, FieldZone } from "./types";
export declare namespace YGODuelEvents {
    enum LogType {
        NormalSummon = "Normal Summon",
        SetMonster = "Set Monster",
        SendToGY = "Send To GY",
        Banish = "Banish",
        BanishFD = "Banish FD",
        DrawCardFromDeck = "Draw From Deck",
        MillCardFromDeck = "Mill From Deck",
        TributeSummon = "Tribute Summon",
        TributeSet = "Tribute Set",
        ToHand = "To Hand",
        ToTopDeck = "To Top Deck",
        ToBottomDeck = "To Bottom Deck",
        SpecialSummon = "Special Summon",
        LinkSummon = "Link Summon",
        XYZSummon = "XYZ Summon",
        XYZAttachMaterial = "XYZ Attach Material",
        XYZDetachMaterial = "XYZ Detach Material",
        XYZOverlay = "XYZOverlay",
        SetST = "Set ST",
        Activate = "Activate",
        ChangeBattlePosition = "Change Battle Position",
        MoveCard = "Move Card",
        Shuffle = "Shuffle",
        ToST = "To ST",
        Reveal = "Reveal",
        Target = "Target"
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
        zone: FieldZone;
    }
    interface SendToGY extends DuelLog {
        id: number;
        originZone: FieldZone;
        zone: FieldZone;
        reason?: "Link Summon" | "XYZ To GY" | undefined;
    }
    interface DrawFromDeck extends DuelLog {
        id: number;
        zone: FieldZone;
    }
    interface LinkSummon extends DuelLog {
        id: number;
        originZone: FieldZone;
        zone: FieldZone;
        materials: Array<{
            id: number;
            zone: FieldZone;
        }>;
    }
    interface XYZSummon extends DuelLog {
        id: number;
        originZone: FieldZone;
        zone: FieldZone;
        position?: CardPosition;
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
        zone: FieldZone;
    }
    interface Target extends DuelLog {
        id: number;
        zone: FieldZone;
    }
}
