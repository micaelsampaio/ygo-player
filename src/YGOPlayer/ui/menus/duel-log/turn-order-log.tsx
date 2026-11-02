import { memo } from "react";
import type { YGOCore, YGODuelEvents } from "ygo-core";
import { DuelLogContainer, DuelLogRow } from "./duel-log-components";

/** The duel's coin toss: who won it, and the turn order they chose (ygo-core TurnOrderCommand). */
export const TurnOrderLogRow = memo(function TurnOrderLogRow({
  log,
  ygo,
}: {
  log: YGODuelEvents.TurnOrder;
  ygo: InstanceType<typeof YGOCore>;
}) {
  const nameOf = (player: number) => ygo.state.fields[player]?.player?.name || `Player ${player + 1}`;
  const winner = nameOf(log.player);
  const choice = log.goingFirst === log.player ? "goes first" : `chose to go second · ${nameOf(log.goingFirst)} goes first`;
  return (
    <DuelLogRow log={log}>
      <DuelLogContainer>
        <div>
          <div className="ygo-text-sm ygo-text-bold">Coin Toss</div>
          <div className="ygo-flex ygo-gap-1 ygo-items-center">
            <div className="ygo-ui-icon ygo-coin-head"></div>
            <div>{winner} won · {choice}</div>
          </div>
        </div>
      </DuelLogContainer>
    </DuelLogRow>
  );
});
