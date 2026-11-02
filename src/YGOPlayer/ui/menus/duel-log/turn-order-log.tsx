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
          <div className="ygo-flex ygo-gap-2 ygo-items-center">
            {/* A fixed square: in a row with the text the 50px sprite was squeezed into an oval. */}
            <div className="ygo-ui-icon ygo-coin-head" style={{ width: 36, height: 36, flexShrink: 0 }}></div>
            <div style={{ minWidth: 0 }}>{winner} won · {choice}</div>
          </div>
        </div>
      </DuelLogContainer>
    </DuelLogRow>
  );
});
