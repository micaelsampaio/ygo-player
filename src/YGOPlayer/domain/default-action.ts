/**
 * Assisted Mode's quick action: what a double-click on one of your cards does, picked from the
 * engine's legal moves for that card (the rows its card menu lists, ui/assist-card-actions.ts).
 * Pure — the duel glue is ui/quick-action.ts.
 *
 * The priority table (the first kind the card has decides; it runs only when that kind is
 * unique — one row, one effect — else the double-click opens the card menu instead):
 *
 * | Where                              | Priority                                                       |
 * |------------------------------------|----------------------------------------------------------------|
 * | Chain window (any card)            | Activate only (exactly one activation)                         |
 * | Hand, monster                      | Activate > Special Summon > Normal Summon > Set                |
 * | Hand, Spell/Trap                   | Activate > Set                                                 |
 * | Field (Main Phase)                 | Activate (a monster with only Change Position: the menu)       |
 * | Field, Battle Phase                | Attack (only with ≤ 1 opposing monster: one target or direct) > Activate |
 * | GY / banished / Extra Deck viewer  | Activate > Special Summon                                      |
 *
 * Engine prompts (a card to pick for an effect) are not here: a double-click picks the
 * candidate (domain/assist-prompt.ts doublePickAnswer).
 */

export type QuickActionPlace = "hand" | "field" | "pile";

export interface QuickActionContext {
  /** The engine's state: "chain" (a chain window), "battle" (the Battle Phase), "idle" (an open game state). */
  pending: string;
  place: QuickActionPlace;
  /** Hand cards: a monster (else a Spell/Trap). */
  isMonster: boolean;
  /** Monsters on the opponent's field (Attack's target count: 0 is a direct attack). */
  opponentMonsters?: number;
}

export interface QuickActionRowLike {
  commandType: string;
  /** Effects / copies folded into the row (two effects of one card: 2). */
  count: number;
}

/** The kinds a double-click may run, most wanted first (see the table above). */
export function quickActionPriority(ctx: QuickActionContext): string[] {
  if (ctx.pending === "chain") return ["Activate"];
  switch (ctx.place) {
    case "hand":
      return ctx.isMonster ? ["Activate", "Special Summon", "Normal Summon", "Set Monster"] : ["Activate", "Set ST"];
    case "field":
      return ctx.pending === "battle" ? ["Attack", "Activate"] : ["Activate"];
    case "pile":
      return ["Activate", "Special Summon"];
  }
}

/** The row a double-click runs, or null (open the card menu / nothing to do). */
export function quickActionRow<R extends QuickActionRowLike>(rows: readonly R[], ctx: QuickActionContext): R | null {
  for (const kind of quickActionPriority(ctx)) {
    const ofKind = rows.filter((r) => r.commandType === kind);
    if (ofKind.length === 0) continue;
    // The top kind the card has decides: several of it (two effects, two summon procedures) is a real choice.
    if (ofKind.length !== 1 || ofKind[0].count !== 1) return null;
    // One target or a direct attack; with more the engine would ask, so the menu is as quick.
    if (kind === "Attack" && (ctx.opponentMonsters ?? 0) > 1) return null;
    return ofKind[0];
  }
  return null;
}
