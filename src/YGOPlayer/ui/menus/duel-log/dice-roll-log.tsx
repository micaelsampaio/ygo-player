import { memo } from "react";
import type { YGODuelEvents } from "ygo-core";
import { DuelLogContainer, DuelLogRow } from "./duel-log-components";

export const DiceRollLogRow = memo(function ({
  log,
}: {
  log: YGODuelEvents.DiceRoll;
}) {
  return (
    <DuelLogRow log={log}>
      <DuelLogContainer>
        <div>
          <div className="ygo-text-sm ygo-text-bold">
            {log.type}
          </div>
          <div className="ygo-flex ygo-gap-1" style={{ flexWrap: "wrap" }}>
            {
              Array.isArray(log.result) && log.result?.map((result: number) => {
                return <div className={`ygo-ui-icon ygo-dice-${result}`}></div>
              })
            }
          </div>
        </div>
      </DuelLogContainer>
    </DuelLogRow>
  );
})
