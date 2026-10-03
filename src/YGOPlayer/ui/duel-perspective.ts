import { createContext, useContext } from "react";
import { YGOPerspective, getActivePerspective } from "../core/YGOPerspective";

/**
 * The duel's perspective (core/YGOPerspective.ts) for components that get no
 * `duel` prop (card menus, duel-log rows). YGOUiController provides it; with
 * no provider it falls back to the perspective of the duel created last.
 */
export const DuelPerspectiveContext = createContext<YGOPerspective | null>(null);

export function useDuelPerspective(): YGOPerspective {
  return useContext(DuelPerspectiveContext) ?? getActivePerspective();
}
