export * from './game/YGOCore';
export * from './game/YGODuelLog';
export * from './game/YGOGameUtils';
export * from './types/duel-events';
export declare const YGOCommands: {
    NormalSummonCommand: typeof import("./commands/NormalSummonCommand").NormalSummonCommand;
    SetMonsterCommand: typeof import("./commands/SetMonsterCommand").SetMonsterCommand;
    SetCardCommand: typeof import("./commands/SetCardCommand").SetCardCommand;
    SendCardToGYCommand: typeof import("./commands/SendCardToGY").SendCardToGYCommand;
    BanishCommand: typeof import("./commands/BanishCommand").BanishCommand;
    DrawFromDeckCommand: typeof import("./commands/DrawFromDeckCommand").DrawFromDeckCommand;
    MillFromDeckCommand: typeof import("./commands/MillFromDeckCommand").MillFromDeckCommand;
    ActivateCardCommand: typeof import("./commands/ActivateCardCommand").ActivateCardCommand;
    SpecialSummonCommand: typeof import("./commands/SpecialSummonCommand").SpecialSummonCommand;
    TributeSummonCommand: typeof import("./commands/TributeSummonCommand").TributeSummonCommand;
    TributeSetCommand: typeof import("./commands/TributeSetCommand").TributeSetCommand;
    LinkSummonCommand: typeof import("./commands/LinkSummonCommand").LinkSummonCommand;
    FusionSummonCommand: typeof import("./commands/FusionSummonCommand").FusionSummonCommand;
    SynchroSummonCommand: typeof import("./commands/SynchroSummonCommand").SynchroSummonCommand;
    XYZSummonCommand: typeof import("./commands/XYZSummonCommand").XYZSummonCommand;
    XYZAttachMaterialCommand: typeof import("./commands/XYZAttachMaterialCommand").XYZAttachMaterialCommand;
    XYZDetachMaterialCommand: typeof import("./commands/XYZDetachMaterialCommand").XYZDetachMaterialCommand;
    ToDeckCommand: typeof import("./commands/ToDeckCommand").ToDeckCommand;
    ShuffleDeckCommand: typeof import("./commands/ShuffleDeck").ShuffleDeckCommand;
    DestroyCardCommand: typeof import("./commands/DestroyCard").DestroyCardCommand;
    RevealCommand: typeof import("./commands/RevealCommand").RevealCommand;
    ToExtraDeckCommand: typeof import("./commands/ToExtraDeckCommand").ToExtraDeckCommand;
    ToHandCommand: typeof import("./commands/ToHandCommand").ToHandCommand;
    FieldSpellCommand: typeof import("./commands/FieldSpellCommand").FieldSpellCommand;
    ChangeCardPositionCommand: typeof import("./commands/ChangeCardPositionCommand").ChangeCardPositionCommand;
    ChangeCardAtkDefCommand: typeof import("./commands/ChangeCardAtkDefCommand").ChangeCardAtkDefCommand;
    FlipCommand: typeof import("./commands/FlipCommand").FlipCommand;
    ToSTCommand: typeof import("./commands/ToSTCommand").ToSTCommand;
};
export declare const debug_version = 2;
