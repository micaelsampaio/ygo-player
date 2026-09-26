/**
 * Assisted Mode: a card's own menu (Activate / Normal Summon / Special Summon
 * / Set) goes through the engine (duel.assist.choose) whenever the current
 * assisted options list that exact move for that card — so the engine runs
 * the effect and the human answers its prompts — instead of a free-form move
 * the engine can't follow. Pure lookup; the glue lives in YGOGameActions.
 */
import { CardRefData, LOC_DECK, LOC_EXTRA, LOC_GRAVE, LOC_HAND, LOC_MZONE, LOC_REMOVED, LOC_SZONE } from "./assist-prompt";

export type AssistMove = "Activate" | "Normal Summon" | "Special Summon" | "Set Monster" | "Set ST";

/** ocgcore location (+ sequence where the ygo zone pins one down) for a ygo-core zone like "M-2", "S2-1", "H-3", "GY". */
export function zoneToLocation(zone: string | undefined | null): { loc: number; seq: number | null } | null {
  if (!zone) return null;
  const [rawId, rawIndex] = zone.split("-");
  const id = rawId.length > 1 && rawId.endsWith("2") ? rawId.slice(0, -1) : rawId;
  const index = rawIndex !== undefined ? Number(rawIndex) : NaN;
  switch (id) {
    case "H": return { loc: LOC_HAND, seq: null }; // hand order isn't guaranteed to match
    case "M": return { loc: LOC_MZONE, seq: Number.isInteger(index) ? index - 1 : null };
    case "EMZ": return { loc: LOC_MZONE, seq: Number.isInteger(index) ? 4 + index : null };
    case "S": return { loc: LOC_SZONE, seq: Number.isInteger(index) ? index - 1 : null };
    case "F": return { loc: LOC_SZONE, seq: 5 };
    case "GY": return { loc: LOC_GRAVE, seq: null };
    case "B": return { loc: LOC_REMOVED, seq: null };
    case "ED": return { loc: LOC_EXTRA, seq: null };
    case "D": return { loc: LOC_DECK, seq: null };
    default: return null;
  }
}

/** The option list a card-menu move maps to, in the assisted query result the panel last saw. */
function listFor(result: any, move: AssistMove): CardRefData[] {
  if (!result?.available) return [];
  if (result.pending === "idle") {
    const o = result.options ?? {};
    switch (move) {
      case "Activate": return o.activatable ?? [];
      case "Normal Summon": return o.summonable ?? [];
      case "Special Summon": return o.spSummon ?? [];
      case "Set Monster": return o.mset ?? [];
      case "Set ST": return o.sset ?? [];
    }
  }
  if (result.pending === "battle" && move === "Activate") return result.options?.activatable ?? [];
  if (result.pending === "chain" && move === "Activate") return result.respond?.activatable ?? [];
  return [];
}

/**
 * The engine ref of the option matching this card (code + location, and the
 * exact zone when the ygo zone names one), or null when the move isn't an
 * option right now.
 */
export function findAssistOption(result: any, move: AssistMove, code: number, zone: string | undefined | null): CardRefData | null {
  const where = zoneToLocation(zone);
  if (!where) return null;
  const matches = listFor(result, move).filter((ref) => ref.code === code && (ref.loc & where.loc) !== 0);
  if (matches.length === 0) return null;
  if (where.seq !== null) return matches.find((ref) => ref.seq === where.seq) ?? matches[0];
  return matches[0];
}

export const ASSIST_FREE_FORM_NOTICE = "Not available in Assisted Mode right now — done as a free-form move.";

export type AssistRoute =
  | { kind: "choose"; ref: CardRefData }
  /** An open chain window of theirs (nothing on the chain yet) is in the way: press Continue first, then look again. */
  | { kind: "continueFirst" }
  /** A chain is being built: the engine accepts only a response or a pass now. */
  | { kind: "blocked"; message: string }
  | { kind: "freeForm" };

export const RESPOND_FIRST_NOTICE = "Respond to the chain first: chain a card, or choose Don't respond.";

/**
 * What a card-menu move does in Assisted Mode, given the assisted options the
 * panel last saw. A move the engine lists goes through it. At the player's
 * own open window — the engine asks "activate anything?" after a summon or a
 * phase change, with no chain yet — a summon or Set isn't listed, but
 * wanting to make one means "no, carry on": Continue, then the move. With a
 * chain on the way, a free-form move would only be rejected by the engine.
 */
export function assistRouteFor(result: any, move: AssistMove, code: number, zone: string | undefined | null): AssistRoute {
  const ref = findAssistOption(result, move, code, zone);
  if (ref) return { kind: "choose", ref };
  if (result?.available && result.pending === "chain") {
    const { chainLength, canPass } = result.respond ?? {};
    if (chainLength === 0 && canPass) return { kind: "continueFirst" };
    if (chainLength > 0) return { kind: "blocked", message: RESPOND_FIRST_NOTICE };
  }
  return { kind: "freeForm" };
}

