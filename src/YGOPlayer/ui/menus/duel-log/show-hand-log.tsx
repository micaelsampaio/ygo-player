import { YGODuel } from "../../../core/YGODuel";
import { memo } from "react";
import { DuelLogContainer, DuelLogRow } from "./duel-log-components";

export const ShowHandLogRow = memo(function ({
  log,
}: {
  log: any;
  duel: YGODuel;
}) {
  return (
    <DuelLogRow log={log}>
      <DuelLogContainer>
        <div className="ygo-text-sm ygo-text-bold">{log.type}</div>
      </DuelLogContainer>
    </DuelLogRow>
  );
})
