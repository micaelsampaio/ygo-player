import { CardBanishMenu } from "./card-banish-menu";
import { CardDeckMenu } from "./card-deck-menu";
import { CardExtraDeckMenu } from "./card-ed-menu";
import { CardGraveyardMenu } from "./card-gy-menu";
import { CardHandMenu } from "./card-hand-menu";
import { CardMaterialsMenu } from "./card-materials-menu";
import { CardMultipleSelectionMenu } from "./card-multiple-selection-menu";
import { CardZoneMenu } from "./card-zone-menu";
import { DeckMenu } from "./deck-menu";

export const ACTIONS = {
    "card-hand-menu": CardHandMenu,
    "deck-menu": DeckMenu,
    "card-zone-menu": CardZoneMenu,
    "card-gy-menu": CardGraveyardMenu,
    "card-banish-menu": CardBanishMenu,
    "card-extra-deck-menu": CardExtraDeckMenu,
    "card-multiple-selection-menu": CardMultipleSelectionMenu,
    "card-deck-menu": CardDeckMenu,
    "card-materials-menu": CardMaterialsMenu,
}