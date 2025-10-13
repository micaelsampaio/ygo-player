import { memo } from "react";
import { DuelLogContainer, DuelLogRow } from "./duel-log-components";

export const AdmitDefeatLogRow = memo(function ({
  log,
}: {
  log: any;
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