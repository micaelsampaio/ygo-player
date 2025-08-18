import { memo } from "react"
import { YGODuelEvents } from "ygo-core"
import { DuelLogContainer } from "./duel-log-components"

export const DuelPhaseLogRow = memo(function SimpleLogRowComponent({ log }: { log: YGODuelEvents.DuelPhase }) {
  return <div className="ygo-duel-log-row">
    <DuelLogContainer>
      <div className="ygo-text-sm ygo-mb-1 ygo-text-bold">
        {log.phase}
      </div>
    </DuelLogContainer>
  </div>
})