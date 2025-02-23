import { Command } from "../types/commands";
import { ActivateCardCommand } from "./ActivateCardCommand";
import { BanishCommand } from "./BanishCommand";
import { ChangeCardAtkDefCommand } from "./ChangeCardAtkDefCommand";
import { ChangeCardPositionCommand } from "./ChangeCardPositionCommand";
import { DestroyCardCommand } from "./DestroyCard";
import { DrawFromDeckCommand } from "./DrawFromDeckCommand";
import { FieldSpellCommand } from "./FieldSpellCommand";
import { FlipCommand } from "./FlipCommand";
import { FusionSummonCommand } from "./FusionSummonCommand";
import { LinkSummonCommand } from "./LinkSummonCommand";
import { MillFromDeckCommand } from "./MillFromDeckCommand";
import { MoveCardCommand } from "./MoveCardCommand";
import { NormalSummonCommand } from "./NormalSummonCommand";
import { RevealCommand } from "./RevealCommand";
import { SendCardToGYCommand } from "./SendCardToGY";
import { SetCardCommand } from "./SetCardCommand";
import { SetMonsterCommand } from "./SetMonsterCommand";
import { ShuffleDeckCommand } from "./ShuffleDeck";
import { SpecialSummonCommand } from "./SpecialSummonCommand";
import { StartHandCommand } from "./StartHandCommand";
import { SynchroSummonCommand } from "./SynchroSummonCommand";
import { TargetCommand } from "./TargetCommand";
import { ToDeckCommand } from "./ToDeckCommand";
import { ToExtraDeckCommand } from "./ToExtraDeckCommand";
import { ToHandCommand } from "./ToHandCommand";
import { ToSTCommand } from "./ToSTCommand";
import { TributeSetCommand } from "./TributeSetCommand";
import { TributeSummonCommand } from "./TributeSummonCommand";
import { XYZAttachMaterialCommand } from "./XYZAttachMaterialCommand";
import { XYZDetachMaterialCommand } from "./XYZDetachMaterialCommand";
import { XYZSummonCommand } from "./XYZSummonCommand";

export interface YGOCommandsList {
    NormalSummonCommand: typeof NormalSummonCommand,
    SetMonsterCommand: typeof SetMonsterCommand,
    SetCardCommand: typeof SetCardCommand,
    SendCardToGYCommand: typeof SendCardToGYCommand,
    BanishCommand: typeof BanishCommand,
    DrawFromDeckCommand: typeof DrawFromDeckCommand,
    MillFromDeckCommand: typeof MillFromDeckCommand,
    ActivateCardCommand: typeof ActivateCardCommand,
    SpecialSummonCommand: typeof SpecialSummonCommand,
    TributeSummonCommand: typeof TributeSummonCommand,
    TributeSetCommand: typeof TributeSetCommand,
    LinkSummonCommand: typeof LinkSummonCommand,
    FusionSummonCommand: typeof FusionSummonCommand,
    SynchroSummonCommand: typeof SynchroSummonCommand,
    XYZSummonCommand: typeof XYZSummonCommand,
    XYZAttachMaterialCommand: typeof XYZAttachMaterialCommand,
    XYZDetachMaterialCommand: typeof XYZDetachMaterialCommand,
    ToDeckCommand: typeof ToDeckCommand,
    ShuffleDeckCommand: typeof ShuffleDeckCommand,
    DestroyCardCommand: typeof DestroyCardCommand,
    RevealCommand: typeof RevealCommand,
    ToExtraDeckCommand: typeof ToExtraDeckCommand,
    ToHandCommand: typeof ToHandCommand,
    FieldSpellCommand: typeof FieldSpellCommand,
    ChangeCardPositionCommand: typeof ChangeCardPositionCommand,
    ChangeCardAtkDefCommand: typeof ChangeCardAtkDefCommand,
    FlipCommand: typeof FlipCommand,
    ToSTCommand: typeof ToSTCommand,
    MoveCardCommand: typeof MoveCardCommand,
    TargetCommand: typeof TargetCommand;
}

export const Commands: YGOCommandsList = {
    NormalSummonCommand,
    SetMonsterCommand,
    SetCardCommand,
    SendCardToGYCommand,
    BanishCommand,
    DrawFromDeckCommand,
    MillFromDeckCommand,
    ActivateCardCommand,
    SpecialSummonCommand,
    TributeSummonCommand,
    TributeSetCommand,
    LinkSummonCommand,
    FusionSummonCommand,
    SynchroSummonCommand,
    XYZSummonCommand,
    XYZAttachMaterialCommand,
    XYZDetachMaterialCommand,
    ToDeckCommand,
    ShuffleDeckCommand,
    DestroyCardCommand,
    RevealCommand,
    ToExtraDeckCommand,
    ToHandCommand,
    FieldSpellCommand,
    ChangeCardPositionCommand,
    ChangeCardAtkDefCommand,
    FlipCommand,
    ToSTCommand,
    MoveCardCommand,
    TargetCommand,
}

export const COMMANDS_BY_NAME: any = {
    "NormalSummonCommand": NormalSummonCommand,
    "SetMonsterCommand": SetMonsterCommand,
    "SetCardCommand": SetCardCommand,
    "SendCardToGYCommand": SendCardToGYCommand,
    "BanishCommand": BanishCommand,
    "DrawFromDeckCommand": DrawFromDeckCommand,
    "MillFromDeckCommand": MillFromDeckCommand,
    "ActivateCardCommand": ActivateCardCommand,
    "SpecialSummonCommand": SpecialSummonCommand,
    "TributeSummonCommand": TributeSummonCommand,
    "TributeSetCommand": TributeSetCommand,
    "LinkSummonCommand": LinkSummonCommand,
    "FusionSummonCommand": FusionSummonCommand,
    "SynchroSummonCommand": SynchroSummonCommand,
    "XYZSummonCommand": XYZSummonCommand,
    "XYZAttachMaterialCommand": XYZAttachMaterialCommand,
    "XYZDetachMaterialCommand": XYZDetachMaterialCommand,
    "ToDeckCommand": ToDeckCommand,
    "ShuffleDeckCommand": ShuffleDeckCommand,
    "DestroyCardCommand": DestroyCardCommand,
    "RevealCommand": RevealCommand,
    "ToExtraDeckCommand": ToExtraDeckCommand,
    "ToHandCommand": ToHandCommand,
    "FieldSpellCommand": FieldSpellCommand,
    "ChangeCardPositionCommand": ChangeCardPositionCommand,
    "ChangeCardAtkDefCommand": ChangeCardAtkDefCommand,
    "FlipCommand": FlipCommand,
    "ToSTCommand": ToSTCommand,
    "MoveCardCommand": MoveCardCommand,
    "StartHandCommand": StartHandCommand,
    "TargetCardCommand": TargetCommand,
}

export function GetCommandByClassName<T = Command>(commandClassName: string): T | null {
    return COMMANDS_BY_NAME[commandClassName];
}