/**
 * The UI controller's state shapes. A leaf module (types only): actions and
 * menus import these instead of YGOUiController, which imports them back.
 */
export type {
    UiGameConfig,
    YGOUiActionEvent,
    YGOUiCloseMenuEvent,
    YGOUiMenuEvent,
    YGOUiMenuVisibilityEvent,
} from "../core/YGODuelUIEvents";

/** A menu the controller renders, in its group ("game-overlay", "game-popup", ...). */
export interface UiMenuState {
    group: string;
    type: string;
    visible: boolean;
    /** Spread into the menu component as props. */
    data?: object;
}

/** The floating action (card menu, attack selection, ...) the controller renders; empty `type` = none. */
export interface UiActionState {
    type: string;
    /** Spread into the action component as props. */
    data?: object | null;
}
