import { memo } from "react";
import { DuelLogContainer, DuelLogRow } from "./duel-log-components";

export const CoinFlipLogRow = memo(function ({
  log,
}: {
  log: any;
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
              Array.isArray(log.result) && log.result?.map((result: any) => {
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
