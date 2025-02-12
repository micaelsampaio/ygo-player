import { CardDeckMenu } from "./card-deck-menu";
import { CardExtraDeckMenu } from "./card-ed-menu";
import { CardGraveyardMenu } from "./card-gy-menu";
import { CardHandMenu } from "./card-hand-menu";
import { CardMultipleSelectionMenu } from "./card-multiple-selection-menu";
import { CardZoneMenu } from "./card-zone-menu";
import { DeckMenu } from "./deck-menu";

export const ACTIONS = {
    "card-hand-menu": CardHandMenu,
    "deck-menu": DeckMenu,
    "card-zone-menu": CardZoneMenu,
    "card-gy-menu": CardGraveyardMenu,
    "card-banish-menu": CardGraveyardMenu,
    "card-extra-deck-menu": CardExtraDeckMenu,
    "card-multiple-selection-menu": CardMultipleSelectionMenu,
    "card-deck-menu": CardDeckMenu,
}