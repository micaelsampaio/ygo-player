import { YGOCore } from "../game/YGOCore";
import { CardPosition, FieldZone } from "./types";
export type CommandType = "NULL" | "Normal Summon" | "Tribute Summon" | "Tribute Set" | "Special Summon" | "Banish" | "Banish FD" | "Shuffle Deck" | "Draw From Deck" | "Mill From Deck" | "Link Summon" | "XYZ Summon" | "XYZ Attach Material" | "XYZ Detach Material" | "Set Monster" | "Set ST" | "To ST" | "Send To GY" | "Destroy" | "Activate" | "Change Battle Position" | "Move Card" | "To Top Deck" | "To Bottom Deck" | "To Hand" | "Reveal" | "Target";
export interface Command {
    parent: Command | null;
    commandId: number;
    init(ygo: YGOCore): void;
    isValid(): boolean;
    exec(): void;
    undo(): void;
    toJSON<T extends any>(): {
        type: string;
        data: T;
    };
}
export interface CommandData<T> {
    type: CommandType;
    data: T;
}
export interface NormalSummonCommandData {
    player: number;
    id: number;
    originZone: FieldZone;
    zone: FieldZone;
    position?: CardPosition;
}
export interface LinkSummonCommandData {
    player: number;
    id: number;
    originZone: FieldZone;
    zone: FieldZone;
    materials: Array<{
        id: number;
        zone: FieldZone;
    }>;
}
export interface XYZSummonCommandData {
    player: number;
    id: number;
    originZone: FieldZone;
    zone: FieldZone;
    position?: CardPosition;
    materials: Array<{
        id: number;
        zone: FieldZone;
    }>;
}
export interface XYZAttachCommandData {
    player: number;
    id: number;
    originZone: FieldZone;
    zone: FieldZone;
}
export interface XYZDetachCommandData {
    player: number;
    zone: FieldZone;
    materialIndex: number;
}
export interface TributeSummonCommandData {
    player: number;
    id: number;
    originZone: FieldZone;
    zone: FieldZone;
    position?: CardPosition;
    tributes: {
        id: number;
        zone: FieldZone;
    }[];
}
export interface SpecialSummonCommandData {
    player: number;
    id: number;
    originZone: FieldZone;
    zone: FieldZone;
    position?: CardPosition;
}
export interface MoveCardCommandData {
    player: number;
    type?: CommandType;
    id: number;
    originZone: FieldZone;
    zone: FieldZone;
    position?: CardPosition;
    log?: boolean;
}
export interface ChangeBattlePositionCommandData {
    player: number;
    id: number;
    originZone: FieldZone;
    zone: FieldZone;
    position: CardPosition;
}
export interface SetMonsterCommandData {
    player: number;
    id: number;
    originZone: FieldZone;
    zone: FieldZone;
}
export interface SetCardCommandData {
    player: number;
    id: number;
    originZone: FieldZone;
    zone: FieldZone;
}
export interface ToSTCommandData {
    player: number;
    id: number;
    originZone: FieldZone;
    zone: FieldZone;
}
export interface SendCardToGYCommandData {
    player: number;
    id: number;
    originZone: FieldZone;
    zone?: FieldZone;
    reason?: "Link Summon" | "XYZ Material" | undefined;
}
export interface DestroyCardCommandData {
    player: number;
    id: number;
    originZone: FieldZone;
    zone?: FieldZone;
}
export interface ToExtraDeckCommandData {
    player: number;
    id: number;
    originZone: FieldZone;
}
export interface DrawFromDeckCommandData {
    player: number;
    numberOfCards?: number;
}
export interface MillFromDeckCommandData {
    player: number;
    numberOfCards?: number;
}
export interface ActivateCardCommandData {
    player: number;
    id: number;
    originZone?: FieldZone;
    zone: FieldZone;
}
export interface BanishCommandData {
    player: number;
    id: number;
    originZone: FieldZone;
    position?: "faceup" | "facedown";
}
export interface ToDeckCommandData {
    player: number;
    id: number;
    originZone: FieldZone;
    position: "top" | "bottom";
    shuffle?: boolean;
}
export interface ShuffleDeckCommandData {
    player: number;
    log?: boolean;
}
export interface RevealCommandData {
    player: number;
    id: number;
    zone: FieldZone;
}
export interface ToHandCommandData {
    player: number;
    id: number;
    originZone: FieldZone;
}
export interface TragetCommandData {
    player: number;
    id: number;
    zone: FieldZone;
}
