import { memo } from "react"
import { DuelLogContainer, DuelLogRow } from "./duel-log-components"

export const SimpleLogRow = memo(function SimpleLogRowComponent({ log }: { log: any }) {
    return <DuelLogRow log={log}>
        <DuelLogContainer>
            <div className="ygo-text-sm ygo-text-bold">
                {log.type}
            </div>
        </DuelLogContainer>
    </DuelLogRow>
})