import { useEffect, useState } from "react";
import type { Card } from "ygo-core";
import type { YGODuel } from "../../core/YGODuel";
import type { AssistQueryResult } from "../../domain/assist-query";
import { cardActionRows, type CardActionRow } from "../assist-card-actions";

/**
 * Master Duel style: the engine's legal moves for this card, at the top of its card menu.
 * A click hands the move to the options panel ("assist-choose-row"), which sends it the same
 * way as its own rows (one path for errors, notices and the refresh after).
 */
export function AssistCardActions({ duel, card, zone }: { duel: YGODuel; card: Card; zone: string }) {
  const [options, setOptions] = useState<AssistQueryResult | null>(() => duel.assistController.options);
  useEffect(() => duel.assistController.subscribe(setOptions), [duel]);
  const rows = cardActionRows(duel, options, card.id, zone);

  const run = (row: CardActionRow) => {
    duel.events.dispatch("clear-ui-action");
    duel.events.dispatch("assist-choose-row", { key: row.key, commandType: row.commandType, data: row.data });
  };

  if (rows.length === 0) {
    return <div className="ygo-card-menu-empty" role="status">No moves for this card right now</div>;
  }
  return <>
    {rows.map((row) => (
      <button key={row.key} type="button" className="ygo-card-item ygo-card-item-engine" onClick={() => run(row)}>
        {row.label}
      </button>
    ))}
  </>;
}
