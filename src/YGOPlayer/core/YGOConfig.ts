import { CardData, YGOReplayData } from "ygo-core";
import { YGOPropsOptions } from "ygo-core";
import { YGOProps } from "ygo-core";
import type { YGOEndGameAction } from "../ui/duel-status";
import type { YGOPlayerErrorHandler } from "./YGOPlayerLogger";


export interface YGOConfigOptions extends YGOPropsOptions {
  player?: number
  showCards?: boolean
}

export interface YGOConfig extends YGOProps {
  cdnUrl: string
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
