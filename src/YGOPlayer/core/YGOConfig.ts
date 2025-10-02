import { YGOReplayData } from "ygo-core";
import { YGOClient } from "ygo-core";
import { YGOPropsOptions } from "ygo-core";
import { YGOProps } from "ygo-core";


export interface YGOConfigOptions extends YGOPropsOptions {
  player?: number
  showHand?: boolean
}

export interface YGOConfig extends YGOProps {
  cdnUrl: string
  gameMode: "EDITOR" | "REPLAY"
  autoChangePlayer?: boolean
  options: YGOConfigOptions
  actions?: {
    saveReplay?: (replay: YGOReplayData) => Promise<void>
    reportBug?: (bugReportData: YGOBugReportData) => Promise<void>
    savePuzzle?: (replay: YGOReplayData) => Promise<void>
  }
}

export interface YGOBugReportData {
  data: YGOReplayData,
  errors: string[],
}
