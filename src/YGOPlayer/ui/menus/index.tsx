import { Banish } from "./banish";
import { ExtraDeck } from "./extra-deck";
import { Graveyard } from "./graveyard";
import { SelectCardPopup } from "./select-card";
import { SelectedCardMenu } from "./select-card-menu";
import { ViewDeckPopup } from "./view-deck";
import { XyzMonsterMaterialsMenu } from "./xyz-monster-materials";

export const MENUS = {
    "extra-deck": ExtraDeck,
    "gy": Graveyard,
    "banish": Banish,
    "xyz-monster-materials": XyzMonsterMaterialsMenu,
    "view-main-deck": ViewDeckPopup,
    "selected-card-menu": SelectedCardMenu,
    "select-card-menu": SelectCardPopup
}