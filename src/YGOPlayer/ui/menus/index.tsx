import { GameSettingsDialog } from "../actions/game-settings-dialog";
import { Banish } from "./banish";
import { ControlsMenu } from "./controls-menu";
import { ExtraDeck } from "./extra-deck";
import { Graveyard } from "./graveyard";
import { SelectCardPopup } from "./select-card";
import { SelectedCardHighlightedMenu } from "./select-card-highligh-menu";
import { SelectedCardMenu } from "./selected-card-menu";
import { ViewDeckPopup } from "./view-deck";
import { XyzMonsterMaterialsMenu } from "./xyz-monster-materials";

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
    "settings-menu": GameSettingsDialog,
}