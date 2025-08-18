import { memo } from "react"
import { YGODuelEvents } from "ygo-core"
import { DuelLogContainer, DuelLogRow } from "./duel-log-components"

export const DuelTurnLogRow = memo(function SimpleLogRowComponent({ log }: { log: YGODuelEvents.DuelTurn }) {
  return <DuelLogRow log={log}>
    <DuelLogContainer>
      <div className="ygo-text-sm ygo-mb-1 ygo-text-bold">
        Turn {log.turn}
      </div>
    </DuelLogContainer>
  </DuelLogRow>
})