/**
 * Assisted Mode, Master Duel style: the engine's legal moves for ONE card, for its own card
 * menu (Activate, Normal Summon, Special Summon, Set, Change Position, Attack). Built from the
 * same rows the options panel lists (assist-sections.ts), so a click sends exactly what the
 * panel would. Pure — no three.js, no React.
 */
import type { YGODuel } from "../core/YGODuel";
import type { AssistQueryResult } from "../domain/assist-query";
import { zoneToLocation } from "../domain/assist-routing";
import { LOC_MZONE, LOC_SZONE } from "./assist-prompt";
import { OptionRow, sectionsFor } from "./assist-sections";

export interface CardActionRow {
  key: string;
  label: string;
  commandType: string;
  data: any;
}

const LABELS: Record<string, string> = {
  "Activate": "Activate",
  "Normal Summon": "Normal Summon",
  "Special Summon": "Special Summon",
  "Set Monster": "Set",
  "Set ST": "Set",
  "Change Card Position": "Change Position",
  "Attack": "Attack",
};

/** The order a card's moves are listed in (Master Duel puts summons first, then effects). */
const ORDER = ["Normal Summon", "Special Summon", "Activate", "Set Monster", "Set ST", "Change Card Position", "Attack"];

/** Whether `row` is about the card with `code` in `zone` (a ygo zone: "H-2", "M-3", "GY", "ED"…). */
export function rowMatchesCard(row: Pick<OptionRow, "code" | "data">, code: number, zone: string | null | undefined): boolean {
  if (row.code !== code) return false;
  const where = zoneToLocation(zone);
  if (!where) return false;
  const loc = typeof row.data?.loc === "number" ? row.data.loc : null;
  // Normal Summon / Set rows carry only the code: they are hand cards.
  if (loc === null) return (where.loc & 0x02) !== 0;
  if ((loc & where.loc) === 0) return false;
  const onField = (loc & (LOC_MZONE | LOC_SZONE)) !== 0;
  // A field card is one exact zone; elsewhere (hand, GY, Extra Deck) any copy is the same move.
  if (onField && where.seq !== null && typeof row.data?.seq === "number") return row.data.seq === where.seq;
  return true;
}

/**
 * The engine's moves for this card right now, labelled for a card menu. Empty while the engine
 * holds a prompt (that is answered in its own dialog) or has nothing for the card.
 */
export function cardActionRows(duel: YGODuel, result: AssistQueryResult | null, code: number, zone: string | null | undefined): CardActionRow[] {
  if (!result || !result.available || result.pending === "prompt") return [];
  const rows = sectionsFor(duel, result)
    .flatMap((section) => section.rows)
    .filter((row) => row.code !== undefined && rowMatchesCard(row, code, zone));
  const seen = new Set<string>();
  const out: CardActionRow[] = [];
  for (const row of rows.sort((a, b) => ORDER.indexOf(a.commandType) - ORDER.indexOf(b.commandType))) {
    const base = LABELS[row.commandType] ?? row.commandType;
    // A Special Summon from the Extra Deck names its kind ("Link Summon"), an Activate in a
    // chain window says it chains.
    const label = row.commandType === "Special Summon" && row.where ? `${row.where} Summon`
      : row.commandType === "Activate" && result.pending === "chain" ? "Chain: Activate"
        : base;
    if (seen.has(row.key)) continue;
    seen.add(row.key);
    out.push({ key: row.key, label, commandType: row.commandType, data: row.data });
  }
  return out;
}

/**
 * Master Duel style card menus: the engine's moves first, the free-play moves folded away.
 * On for bot duels with Assisted Mode (where the engine runs every rule).
 */
export function isMasterDuelStyle(duel: Pick<YGODuel, "assist" | "ygo"> | null | undefined): boolean {
  const options = duel?.ygo?.options as { assistedMode?: boolean; botDuel?: unknown } | undefined;
  return !!duel?.assist && !!options?.assistedMode && !!options?.botDuel;
}
