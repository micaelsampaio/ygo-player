import { CardData, YGOReplayData } from "ygo-core";
import { YGOPropsOptions } from "ygo-core";
import { YGOProps } from "ygo-core";
import type { YGOEndGameAction } from "../domain/end-game";
import type { YGOPlayerErrorHandler } from "./YGOPlayerLogger";


export interface YGOConfigOptions extends YGOPropsOptions {
  player?: number
  showCards?: boolean
  /** Starts the field timer as a countdown of this many seconds when the board is ready (local duels). */
  duelTimerSeconds?: number
  /** Local duels: ask whether to end the duel when a player's life points reach 0 (see ui/menus/zero-lp-prompt). */
  zeroLpPrompt?: boolean
  /**
   * Practice (a bot duel's "Show the bot's cards"): the opponent's hand and face-down cards are
   * shown face-up. Unlike showCards it gives no control over them and keeps the player's own
   * perspective (no autoChangePlayer). The cards' data must reach the client (no hidden info).
   */
  revealOpponentCards?: boolean
}

export interface YGOConfig extends YGOProps {
  cdnUrl: string
  /** The host's card API base URL, used to download a server room's cards
   * when `actions.fetchCardsById` is not given. */
  apiUrl?: string
  gameMode: "EDITOR" | "REPLAY"
  autoChangePlayer?: boolean
  options: YGOConfigOptions
  /** Next steps offered on the end-of-duel overlay (see YGOEndGameAction). */
  endGameActions?: YGOEndGameAction[]
  /** Called with every error the player catches and recovers from (see YGOPlayerLogger). */
  onError?: YGOPlayerErrorHandler
  actions?: {
    fetchCardsById?(ids: number[]): Promise<CardData[]>
    saveReplay?: (replay: YGOReplayData) => Promise<void>
    reportBug?: (bugReportData: YGOBugReportData) => Promise<void>
    savePuzzle?: (replay: YGOReplayData) => Promise<void>
  }
}

export interface YGOBugReportData {
  data: YGOReplayData,
  errors: string[],
}
