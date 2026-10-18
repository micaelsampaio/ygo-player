import { YGODuel } from "../../../core/YGODuel";
import { memo } from "react";
import type { YGODuelEvents } from "ygo-core";
import { DuelLogContainer, DuelLogRow } from "./duel-log-components";

export const ShowHandLogRow = memo(function ({
  log,
}: {
  log: YGODuelEvents.ShowHand;
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
