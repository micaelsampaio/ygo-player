import { memo } from "react"

export const SimpleLogRow = memo(function SimpleLogRowComponent({ log }: { log: any }) {
    return <div className="ygo-duel-log-default-row">
        {log.type}
    </div>
})