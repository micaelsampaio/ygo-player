import type { Card, YGODuelEvents, YGOReplayData } from "ygo-core";
import type { AssistQueryResult } from "../domain/assist-query";
import type { YGOEndGameAction } from "../domain/end-game";
import type { PuzzleRetryRequest } from "../domain/puzzle-retry";
import type { GameCard } from "../game/GameCard";

/** The game-level flags the UI controller hands every menu/action as `config`. */
export interface UiGameConfig {
    actions: boolean
    startReplay: boolean
}

/** A floating action (card menu, attack selection, ...) the UI controller renders. */
export interface YGOUiActionEvent {
    type: string;
    /** Spread into the action component as props. */
    data?: object;
}

/** A menu in one of the UI controller's groups ("game-overlay", "game-popup", ...). */
export interface YGOUiMenuEvent {
    group: string;
    type: string;
    /** Spread into the menu component as props. */
    data?: object;
}

/** Closes every menu in `group`, or else the menu of that `type`. */
export interface YGOUiCloseMenuEvent {
    group?: string;
    type?: string;
}

export interface YGOUiMenuVisibilityEvent {
    group?: string;
    type?: string;
    visibility: boolean;
}

/** A card was pressed in the 3D field or a card list. (Card lists also send
 * React touch events here; listeners read it as a mouse event.) */
export interface YGOCardPointerEvent {
    card: Card | null;
    event: MouseEvent;
}

/** A card was released. A field zone sends its GameCard rather than the Card. */
export interface YGOCardPointerUpEvent {
    card: Card | GameCard | null;
    event: MouseEvent;
}

/**
 * The duel's UI event bus (YGODuel.events): every event the player emits
 * between core/, game/, actions/ and the React UI, with its payload. Built
 * from the existing dispatch / on call sites; compile-time only.
 */
export interface YGODuelUIEvents {
    "render-ui": () => void;

    "set-ui-action": (args: YGOUiActionEvent) => void;
    "clear-ui-action": () => void;
    "set-ui-menu": (args: YGOUiMenuEvent) => void;
    "toggle-ui-menu": (args: YGOUiMenuEvent) => void;
    "close-ui-menu": (args: YGOUiCloseMenuEvent) => void;
    "set-ui-menu-visibility": (args: YGOUiMenuVisibilityEvent) => void;
    "update-game-ui-config": (config: Partial<UiGameConfig>) => void;

    "enable-game-actions": () => void;
    "disable-game-actions": () => void;
    "commands-process-completed": () => void;

    "on-card-mouse-down": (args: YGOCardPointerEvent) => void;
    "on-card-mouse-up": (args: YGOCardPointerUpEvent) => void;
    "set-selected-card": (args: { card: Card | null | undefined; player?: number }) => void;

    "logs-updated": (logs: YGODuelEvents.DuelLog[]) => void;
    "duel-update-player-life-points": (args: YGODuelEvents.LifePoints) => void;
    "system-chat-message": (args: { message: string }) => void;

    "game-defeat": (args: { player: number }) => void;
    "end-game-action": (args: { action: YGOEndGameAction; loser: number; replay: YGOReplayData | null }) => void;
    "puzzle-retry": (args: PuzzleRetryRequest) => void;

    // Room events from the server (room-events.ts); payloads are read defensively.
    "puzzle-state": (data: unknown) => void;
    "duel-preferences": (data: unknown) => void;
    "deck-search-contents": (data: unknown) => void;
    "deck-search-taken": (data: unknown) => void;

    // Assisted Mode
    "assist-options": (options: AssistQueryResult | null) => void;
    "assist-refresh": (payload?: object) => void;
    "assist-notice": (payload?: { message?: string }) => void;
    "assist-choice-start": (payload?: { code?: number }) => void;
    "assist-choice-done": (payload?: { error?: unknown; notices?: string[] }) => void;
}

export type YGODuelUIEventName = keyof YGODuelUIEvents;
