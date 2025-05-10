import { SelectCardAction } from "./action-select-card"

export enum PRE_GAME_ACTIONS_TYPES {
  select_card_zone = "select_card_zone"
}

export const PRE_GAME_ACTIONS: {
  [key in PRE_GAME_ACTIONS_TYPES]: any
} = {
  [PRE_GAME_ACTIONS_TYPES.select_card_zone]: SelectCardAction
}

export function getPreGameAction(actionName: PRE_GAME_ACTIONS_TYPES): any | null {
  return PRE_GAME_ACTIONS[actionName] ?? null;
}