import { DuelNotesActionEventHandler } from "./duel-notes-action-handler";
import { GameSettingsMenu } from "./game-settings/game-settings-menu";
import { Banish } from "./banish";
import { ControlsMenu } from "./controls-menu";
import { ExtraDeck } from "./extra-deck";
import { Graveyard } from "./graveyard";
import { SelectCardPopup } from "./select-card";
import { SelectedCardHighlightedMenu } from "./select-card-highligh-menu";
import { SelectedCardMenu } from "./menu-panel/components/selected-card-menu";
import { ViewDeckPopup } from "./view-deck";
import { XyzMonsterMaterialsMenu } from "./xyz-monster-materials";
import { DuelEndGameOverlay } from "./duel-endgame-overlay";

export const MENUS = {
    "extra-deck": ExtraDeck,
    "gy": Graveyard,
    "banish": Banish,
    "xyz-monster-materials": XyzMonsterMaterialsMenu,
    "view-main-deck": ViewDeckPopup,
    "selected-card-menu": SelectedCardMenu,
    "selected-card-highlight": SelectedCardHighlightedMenu,
    "select-card-menu": SelectCardPopup,
    "controls-menu": ControlsMenu,
    "settings-menu": GameSettingsMenu,
    "duel-notes-game-event-hanlder": DuelNotesActionEventHandler,
    "duel-endgame-overlay": DuelEndGameOverlay,
}