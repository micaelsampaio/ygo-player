/**
 * Assisted Mode: what dropping a hand card means — the engine's legal moves for that card (the
 * same rows its card menu lists, assist-card-actions.ts) mapped onto the drop target by
 * domain/hand-drag.ts. The move is sent through the options panel ("assist-choose-row", like a
 * card-menu pick) with the drop's zone and position, which then answer the engine's zone and
 * position questions for that move (assist-prompt-view.tsx).
 */
import { YGOGameUtils, type Card } from "ygo-core";
import type { YGODuel } from "../core/YGODuel";
import type { HandDropProvider } from "../core/components/YGOHandDrag";
import type { GameCardHand } from "../game/GameCardHand";
import { dropTargets, planDrop, type DragCardInfo, type DropRow } from "../domain/hand-drag";
import { cardActionRows } from "./assist-card-actions";

export function dragCardInfo(card: Card): DragCardInfo {
  return {
    code: card.id,
    isMonster: !!YGOGameUtils.isMonster(card),
    isFieldSpell: YGOGameUtils.isFieldSpell(card),
    level: typeof card.level === "number" ? card.level : undefined,
  };
}

/** The hand zone id cardActionRows reads ("H-2", "H2-1"): only its location matters. */
const handZone = (handCard: GameCardHand) => `H${handCard.player === 1 ? "2" : ""}-${handCard.handIndex + 1}`;

export function createAssistedHandDropProvider(duel: YGODuel): HandDropProvider {
  const rowsFor = (handCard: GameCardHand): DropRow[] =>
    cardActionRows(duel, duel.assistController.options, handCard.card.id, handZone(handCard));

  return {
    targets(handCard, zones) {
      const rows = rowsFor(handCard);
      if (rows.length === 0) return null;
      return dropTargets(dragCardInfo(handCard.card), rows, zones);
    },
    drop(handCard, target, { shift, event, targets }) {
      const plan = planDrop(dragCardInfo(handCard.card), rowsFor(handCard), target, targets, { shift });
      if (plan.kind === "menu") {
        handCard.openMenu(event);
        return;
      }
      if (plan.kind !== "row") return;
      const { row, intent } = plan;
      duel.events.dispatch("assist-choose-row", { key: row.key, commandType: row.commandType, data: row.data, drop: intent });
    },
  };
}
