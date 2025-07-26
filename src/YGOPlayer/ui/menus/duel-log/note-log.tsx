import { memo, useMemo } from "react"
import { DuelLogContainer, DuelLogRow } from "./duel-log-components"

export const NoteLogRow = memo(function SimpleLogRowComponent({ log }: { log: any }) {

  const notes = useMemo(() => {
    return String(log.note || "No content").split("\n").map((line: string) => <div>{line}</div>);
  }, [log.note]);

  return <DuelLogRow log={log}>
    <DuelLogContainer>
      <div>
        <div className="ygo-text-sm ygo-text-bold">
          Notes:
        </div>
        <div className="ygo-text-lg">
          {notes}
        </div>
      </div>
    </DuelLogContainer>
  </DuelLogRow>
})