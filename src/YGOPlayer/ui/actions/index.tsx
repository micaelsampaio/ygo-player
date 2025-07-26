import { DuelNotesFormAction } from "./duel-notes-form";
import { CardBanishMenu } from "./card-banish-menu";
import { CardDeckMenu } from "./card-deck-menu";
import { CardExtraDeckMenu } from "./card-ed-menu";
import { CardGraveyardMenu } from "./card-gy-menu";
import { CardHandMenu } from "./card-hand-menu";
import { CardMaterialsMenu } from "./card-materials-menu";
import { CardMultipleSelectionMenu } from "./card-multiple-selection-menu";
import { CardStatsDialog } from "./card-stats-dialog";
import { CardZoneMenu } from "./card-zone-menu";
import { DeckMenu } from "./deck-menu";
import { GlobalEventsActionsMenu } from "./global-events-actions-menu";
import { TimerEventsActionsMenu } from "./timer-events-menu";

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
    "card-stats-dialog-menu": CardStatsDialog,
    "global-events-menu": GlobalEventsActionsMenu,
    "timer-events-menu": TimerEventsActionsMenu,
    "duel-notes-form-menu": DuelNotesFormAction,
}