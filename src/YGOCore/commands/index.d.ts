import { ActivateCardCommand } from "./ActivateCardCommand";
import { BanishCommand } from "./BanishCommand";
import { DestroyCardCommand } from "./DestroyCard";
import { DrawFromDeckCommand } from "./DrawFromDeckCommand";
import { LinkSummonCommand } from "./LinkSummonCommand";
import { MillFromDeckCommand } from "./MillFromDeckCommand";
import { NormalSummonCommand } from "./NormalSummonCommand";
import { RevealCommand } from "./RevealCommand";
import { SendCardToGYCommand } from "./SendCardToGY";
import { SetCardCommand } from "./SetCardCommand";
import { SetMonsterCommand } from "./SetMonsterCommand";
import { ShuffleDeckCommand } from "./ShuffleDeck";
import { SpecialSummonCommand } from "./SpecialSummonCommand";
import { ToDeckCommand } from "./ToDeckCommand";
import { ToExtraDeckCommand } from "./ToExtraDeckCommand";
import { ToHandCommand } from "./ToHandCommand";
import { TributeSetCommand } from "./TributeSetCommand";
import { TributeSummonCommand } from "./TributeSummonCommand";
import { XYZAttachMaterialCommand } from "./XYZAttachMaterialCommand";
import { XYZDetachMaterialCommand } from "./XYZDetachMaterialCommand";
import { XYZSummonCommand } from "./XYZSummonCommand";
export declare const Commands: {
    NormalSummonCommand: typeof NormalSummonCommand;
    SetMonsterCommand: typeof SetMonsterCommand;
    SetCardCommand: typeof SetCardCommand;
    SendCardToGYCommand: typeof SendCardToGYCommand;
    BanishCommand: typeof BanishCommand;
    DrawFromDeckCommand: typeof DrawFromDeckCommand;
    MillFromDeckCommand: typeof MillFromDeckCommand;
    ActivateCardCommand: typeof ActivateCardCommand;
    SpecialSummonCommand: typeof SpecialSummonCommand;
    TributeSummonCommand: typeof TributeSummonCommand;
    TributeSetCommand: typeof TributeSetCommand;
    LinkSummonCommand: typeof LinkSummonCommand;
    XYZSummonCommand: typeof XYZSummonCommand;
    XYZAttachMaterialCommand: typeof XYZAttachMaterialCommand;
    XYZDetachMaterialCommand: typeof XYZDetachMaterialCommand;
    ToDeckCommand: typeof ToDeckCommand;
    ShuffleDeckCommand: typeof ShuffleDeckCommand;
    DestroyCardCommand: typeof DestroyCardCommand;
    RevealCommand: typeof RevealCommand;
    ToExtraDeckCommand: typeof ToExtraDeckCommand;
    ToHandCommand: typeof ToHandCommand;
};
export declare const COMMANDS_BY_NAME: any;
export { NormalSummonCommand, SetMonsterCommand, SetCardCommand, SendCardToGYCommand, BanishCommand, DrawFromDeckCommand, MillFromDeckCommand, ActivateCardCommand, SpecialSummonCommand, TributeSummonCommand, TributeSetCommand, LinkSummonCommand, XYZSummonCommand, XYZAttachMaterialCommand, XYZDetachMaterialCommand, ToDeckCommand, ShuffleDeckCommand, DestroyCardCommand, RevealCommand, ToExtraDeckCommand, ToHandCommand };
