import { YGOCore, YGODuelEvents } from "ygo-core";
import { YGODuel } from "../../../core/YGODuel";
import { DuelLogContainer, DuelLogRow } from "./duel-log-components";

export function LifePointsLogRow({
  log,
}: {
  log: YGODuelEvents.LifePoints;
  duel: YGODuel;
  ygo: InstanceType<typeof YGOCore>;
}){

  const lifepoints = log.lifePoints;
  const diff = lifepoints - log.previousLifePoints;
  const gainLifePoints = diff >= 0;
  const diffLifePoints = Math.abs(diff * -1);

  return (
    <DuelLogRow log={log}>
      <DuelLogContainer>
        <div className="ygo-duel-log-default-row ygo-relative">
          <div className="ygo-text-sm ygo-mb-1 ygo-text-bold">
            Life Points
          </div>

          <div className="ygo-lps-divider"></div>

          <div className="ygo-flex ygo-mt-2 ygo-gap-1">
            <div>
              <div className="ygo-text-3xl" style={{ color: gainLifePoints ? "blue" : "red" }}>
                <div className="pr-2">
                  <b>{diffLifePoints}</b>
                </div>
                <div className="ygo-text-md ygo-text-right ygo-o-70" style={{ color: "white" }}>LP</div>
              </div>
            </div>
            <div>
              <div className="ygo-text-xl pl-2">
                <div style={{ marginTop: "35px" }}></div>
                <b>{lifepoints}</b>
              </div>
            </div>
          </div>
        </div>
      </DuelLogContainer>
    </DuelLogRow>
  );
}