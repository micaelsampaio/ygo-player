import type { Command } from "ygo-core";
import type { YGODuel } from "../../../core/YGODuel";

/** Where a timeline command sits relative to the current one. */
export type TimelineCommandClass = "current" | "prev" | "next";

/** Props of one timeline row and of its tooltip. */
export interface TimelineCommandProps {
  duel: YGODuel
  command: Command
  index: number
  commandClass: TimelineCommandClass
  onCommandClick: (command: Command) => void
}
