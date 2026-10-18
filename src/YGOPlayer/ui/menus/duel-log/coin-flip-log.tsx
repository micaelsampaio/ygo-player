import { memo } from "react";
import type { YGODuelEvents } from "ygo-core";
import { DuelLogContainer, DuelLogRow } from "./duel-log-components";

export const CoinFlipLogRow = memo(function ({
  log,
}: {
  log: YGODuelEvents.CoinFlip;
}) {
  return (
    <DuelLogRow log={log}>
      <DuelLogContainer>
        <div>
          <div className="ygo-text-sm ygo-text-bold">
            {log.type}
          </div>
          <div className="ygo-flex ygo-flex-col ygo-gap-1" style={{ flexWrap: "wrap" }}>
            {
              Array.isArray(log.result) && log.result?.map((result) => {
                return <div className="ygo-space-y-2">

                  {
                    result ? <>
                      <div className="ygo-ui-icon ygo-coin-head"></div>
                      <div>
                        Heads
                      </div>
                    </> : <>
                      <div className="ygo-ui-icon ygo-coin-tail"></div>
                      <div>
                        Tails
                      </div>
                    </>
                  }

                </div>
              })
            }
          </div>
        </div>
      </DuelLogContainer>
    </DuelLogRow>
  );
})
