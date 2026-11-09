import * as THREE from "three";
import { type YGOClient, type YGOSerializedCommand } from "ygo-core";
import type { YGOEndGameAction } from "./ui/duel-status";
import type { YGOPlayerErrorHandler } from "./core/YGOPlayerLogger";

export type { YGOEndGameAction };
import {
  Card,
  CardData,
  FieldZone,
  YGOPropsOptions,
  YGOReplayData,
} from "ygo-core";

export enum YGODuelState {
  REPLAY = "replay",
  PLAY = "play",
  EDITOR = "editor",
  EXEC_COMMAND = "exec_command",
  UNDO_COMMAND = "undo_command",
}
export interface GameFieldLocation {
  zone: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  gameObject: THREE.Mesh;
  side: number;
}

export interface YGOUiElement {
  gameObject: THREE.Object3D;
  isUiElement?: boolean;
  isUiElementClick?: boolean;
  isUiElementHover?: boolean;
  isUiCardElement?: boolean;
  onMouseClick?(event: MouseEvent): void;
  onMouseDown?(event: MouseEvent): void;
  onMouseUp?(event: MouseEvent): void;
  onMouseEnter?(event: MouseEvent): void;
  onMouseLeave?(event: MouseEvent): void;
}

export interface CardZoneKV {
  card: Card;
  zone: FieldZone;
}

export interface YGOPlayerData {
  name: string;
  mainDeck: CardData[];
  extraDeck: CardData[];
}

export interface YGOReplayDeckData {
  mainDeck: CardData[];
  extraDeck: CardData[];
}

export interface YGOPlayerStartEditorProps {
  cdnUrl: string;
  /** The card API base URL the duel's cards are downloaded from
   * (`${apiUrl}/cards?ids=…`) when they are not in the decks given. */
  apiUrl?: string;
  players: YGOPlayerData[];
  commands: YGOSerializedCommand[];
  options: YGOPropsOptions;
  gameMode?: "EDITOR" | "REPLAY"
  endGameActions?: YGOEndGameAction[]
  /** Sees every error the player catches and recovers from (see YGOPlayerLogger). */
  onError?: YGOPlayerErrorHandler;
  actions?: {
    saveReplay?: (replay: YGOReplayData) => Promise<void>
  }
}

export interface YGOPlayerStartReplayProps {
  cdnUrl: string;
  /** The card API base URL the duel's cards are downloaded from
   * (`${apiUrl}/cards?ids=…`) when they are not in the decks given. */
  apiUrl?: string;
  decks: YGOReplayDeckData[];
  replay: YGOReplayData;
  options: YGOPropsOptions;
  endGameActions?: YGOEndGameAction[];
  /** Sees every error the player catches and recovers from (see YGOPlayerLogger). */
  onError?: YGOPlayerErrorHandler;
  actions?: {
    saveReplay?: (replay: YGOReplayData) => Promise<void>
  }
}


/** Ack-based request/response for assisted mode — see AssistedOptionsPanel.
 * The host app (ygo101-web) wires these to its own outer socket layer
 * (kaibaNet.emitEvent), since judge/adapter access lives server-side in
 * ygo-socket-server, entirely outside ygo-core's own command/log system. */
/** Duel Coach stats for the player's deck (ygo101-web builds them from the analyser). */
export interface CoachStats {
  /** Label shown, e.g. "TCG" or "TCG (fallback)". */
  format: string;
  deckType?: { name: string; confidence: number };
  overall?: { games: number; wins: number };
  goingFirst?: { games: number; wins: number };
  goingSecond?: { games: number; wins: number };
  /** null: the bot's deck type isn't revealed yet. */
  matchup?: { vs: string; games: number; wins: number; first?: { games: number; wins: number }; second?: { games: number; wins: number } } | null;
  /** Hand traps that hurt going first (lowest win rate first), max 5. */
  stoppedBy?: Array<{ name: string; games: number; wins: number; code?: number }>;
  /** Best going-second cards, max 5. */
  breakers?: Array<{ name: string; games: number; wins: number }>;
  /** Most played (tournament lists), max 8. */
  topCards?: Array<{ name: string; popularity: number; copies?: number }>;
  /**
   * Chance 0..1 the opponent holds at least one in its opening hand, max 5. With `code` + `dist`
   * (the share 0..1 of the deck type's lists at each copy count) the coach recounts it live:
   * the bot's hand size now, its deck size, minus the copies it has already shown.
   */
  oppHandTraps?: Array<{ name: string; chance: number; code?: number; dist?: Array<{ copies: number; share: number }> }>;
  /**
   * The bot's deck type as guessed from the cards of it seen so far (never from its deck list):
   * each candidate's share 0..1, best first. The deck-type stats (matchup, oppHandTraps,
   * oppAnswers) are for the first one, and only once it's clear enough. Null: nothing seen yet.
   */
  oppGuess?: { seen: number; types: Array<{ name: string; share: number }> } | null;
  /** The bot's deck going first, from replays (only once its deck type is revealed). */
  oppAnswers?: CoachOppAnswers | null;
}

/** How the bot's deck type does on its turn 1 when answered (CoachStats.oppAnswers). */
export interface CoachOppAnswers {
  /** The bot's deck type. */
  deckType: string;
  /** Its win rate going first when not interrupted on turn 1. */
  clean?: { games: number; wins: number };
  interrupted?: { games: number; wins: number };
  /** By number of interruptions ("0", "1", "2", "3+"). */
  byInterruptions?: Array<{ label: string; games: number; wins: number }>;
  /** Its cards answered most. */
  chokePoints?: Array<{ code: number; name: string; games: number; wins: number }>;
  answers: Array<{ answer: { code: number; name: string }; target: { code: number; name: string }; games: number; wins: number }>;
}

/** Duel Coach (bot / solo duels only): the host app wires these to ygo-socket-server's duel:coach:* events. */
export interface CoachHost {
  /** Initial state. */
  enabled: boolean;
  /** duel:coach:set */
  setEnabled(on: boolean): Promise<unknown>;
  /** Initial stats (may arrive later via onStats). */
  stats?: CoachStats | null;
  /** Stats updates (e.g. the bot's deck type revealed); returns the unsubscribe. */
  onStats?(cb: (s: CoachStats | null) => void): () => void;
  /** duel:coach:preview ack */
  preview(): Promise<unknown>;
  /** duel:coach:suggest ack */
  suggest(): Promise<unknown>;
}

export interface YGOAssistActions {
  query(): Promise<unknown>;
  choose(action: { commandType: string; data: unknown }): Promise<unknown>;
  /** Bot duels: the post-duel review of the player's plays (ygo-socket-server `duel:bot:review`), shown as "Review my plays" on the end-of-duel overlay. */
  review?(): Promise<unknown>;
  /** Bot duels: why the player is surrendering (ygo-socket-server `duel:bot:feedback`), optional. */
  leaveFeedback?(reason: string): Promise<unknown>;
  /** Bot duels: the player's 1–5 star rating of the game, and optionally why (ygo-socket-server `duel:bot:rate`), on the end-of-duel overlay. */
  rate?(stars: number, reason?: string): Promise<unknown>;
  /** Bot duels: "Report a bug" also marks this moment in the game's bot log (ygo-socket-server `duel:bot:flag`). */
  flag?(): Promise<unknown>;
  /** Duel Coach (bot / solo duels): absent, the coach panel, hints and previews never show. */
  coach?: CoachHost;
}

export interface YGOPlayerConnectToServerProps {
  client: YGOClient
  cdnUrl: string;
  /** The card API base URL the room's cards are downloaded from
   * (`${apiUrl}/cards?ids=…`) when `actions.fetchCardsById` is not given. */
  apiUrl?: string;
  assist?: YGOAssistActions;
  /** Next steps offered on the end-of-duel overlay; handled via the
   * component's "end-game-action" event. */
  endGameActions?: YGOEndGameAction[];
  /** Sees every error the player catches and recovers from (see YGOPlayerLogger). */
  onError?: YGOPlayerErrorHandler;
  /** Practice: the opponent's hand and face-down cards are shown face-up to this player. Display
   * only: they still can't be moved, and the duel's rules don't change (YGOConfigOptions.revealOpponentCards). */
  revealOpponentCards?: boolean;
  /** The field timer counts down from this many seconds when the board is ready (YGOConfigOptions.duelTimerSeconds); absent: a bot duel's timer counts up. */
  duelTimerSeconds?: number;
  /** Mid-duel actions, as in the editor. With `saveReplay` the game settings
   * menu offers "Save Replay" during the duel (e.g. recording a combo). */
  actions?: {
    saveReplay?: (replay: YGOReplayData) => Promise<void>
    /** Downloads the room's cards (preferred over `apiUrl`). */
    fetchCardsById?: (ids: number[]) => Promise<CardData[]>
  };
}

export interface YGOAudioLayer {
  name: string
  enabled: boolean
  useTimeScale: boolean
  volume: number
  sounds: YGOAudioClip[]
}

export interface YGOAudioClip {
  key: string
  playing: boolean
  volume: number
  loop: boolean
  element: HTMLAudioElement
}