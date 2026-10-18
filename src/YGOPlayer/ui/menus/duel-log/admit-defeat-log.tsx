import { memo } from "react";
import type { YGODuelEvents } from "ygo-core";
import { DuelLogContainer, DuelLogRow } from "./duel-log-components";

export const AdmitDefeatLogRow = memo(function ({
  log,
}: {
  log: YGODuelEvents.AdmitDefeat;
}) {
  return (
    <DuelLogRow log={log}>
      <DuelLogContainer>
        <div>
          <div className="ygo-text-sm ygo-text-bold">
            Admitted defeat
          </div>
        </div>
      </DuelLogContainer>
    </DuelLogRow>
  );
});