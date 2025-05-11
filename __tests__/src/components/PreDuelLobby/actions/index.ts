import { SelectCardAction } from "./action-select-card"
import { ActionUpdateCardDetails } from "./action-update-card";

export enum PRE_GAME_ACTIONS_TYPES {
  select_card_zone = "select_card_zone",
  update_card_zone = "update_card_zone"
}

export const PRE_GAME_ACTIONS: {
  [key in PRE_GAME_ACTIONS_TYPES]: any
} = {
  [PRE_GAME_ACTIONS_TYPES.select_card_zone]: SelectCardAction,
  [PRE_GAME_ACTIONS_TYPES.update_card_zone]: ActionUpdateCardDetails
}

export function getPreGameAction(actionName: PRE_GAME_ACTIONS_TYPES | undefined): any | null {
  return actionName ? PRE_GAME_ACTIONS[actionName] ?? null : null;
}