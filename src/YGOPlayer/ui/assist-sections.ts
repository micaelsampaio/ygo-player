/**
 * Assisted Mode: the option rows the panel lists for an engine query result
 * (Activate per copy location, Special Summon grouped by origin, Normal
 * Summon, Set, Change Position, Attack, Next Phase, the chain window's
 * responses and Pass). Pure — no three.js, no React.
 */
import type { YGODuel } from "../core/YGODuel";
import { phaseLabel } from "./duel-status";
import { passLabel, respondSectionTitle } from "./assist-respond";
import { extraDeckSummonKind, groupSpecialSummons } from "./menus/special-summon-groups";
import { CardRefData, PromptData, locationLabel, LOC_MZONE as LOC_M, LOC_SZONE as LOC_S } from "./assist-prompt";
import type { AssistQueryResult, BattleOptions } from "../domain/assist-query";

export type { IdleOptions, BattleOptions, AssistQueryResult } from "../domain/assist-query";

export interface OptionRow {
  key: string;
  label: string;
  commandType: string;
  data: any;
  /** The card this option acts on, if any (absent for phase-transition rows). */
  code?: number;
  /** Where the card is ("Hand", "Field", "GY", …) — shown for Activate, where it's genuinely ambiguous. */
  where?: string;
  /** How many copies collapse into this row. Activate rows carry the exact
   * engine ref of one copy (the server activates that copy), so they only
   * collapse copies in the same location, and never field copies. */
  count: number;
  /** Only "Activate" rows get the on-card glow — summoning/setting a card you're already holding doesn't need it pointed out. */
  highlight: boolean;
  /** The glow's kind: "play" (amber) — Spell Speed 1, only on your own open
   * game state; "quick" (blue) — Spell Speed 2+ or a chain response. */
  tone?: Tone;
}


export type Tone = "play" | "quick";
export const TONE_TITLE: Record<Tone, string> = {
  play: "Amber: usable on your own open game state (Spell Speed 1)",
  quick: "Blue: a quick effect, Quick-Play, Trap or trigger — usable in response (Spell Speed 2+)",
};

export interface Section {
  title: string;
  rows: OptionRow[];
}

const LOCATION_MZONE = LOC_M;
const LOCATION_SZONE = LOC_S;

function cardRows(
  duel: YGODuel, refs: CardRefData[], commandType: string, dataKey: string, activate = false, toneOf?: (index: number) => Tone,
  // exact: rows per copy location with its engine ref (Activate always is); tag: the row's small label.
  opts: { exact?: boolean; tag?: (code: number) => string | undefined } = {},
): OptionRow[] {
  const byKey = new Map<string, OptionRow>();
  const exact = activate || !!opts.exact;
  for (const [index, ref] of refs.entries()) {
    const tone = activate ? (toneOf?.(index) ?? "play") : undefined;
    const where = activate ? locationLabel(ref.loc) : opts.tag?.(ref.code);
    // Activate: the same code in hand vs GY (or two face-up copies on the
    // field) are different choices, so key on the exact location — plus the
    // zone for field cards — and send that copy's ref, not just its code.
    const onField = (ref.loc & (LOCATION_MZONE | LOCATION_SZONE)) !== 0;
    const key = exact
      ? `${commandType}:${ref.code}:${ref.ctrl}:${ref.loc}${onField ? `:${ref.seq}` : ""}`
      : `${commandType}:${ref.code}`;
    const existing = byKey.get(key);
    // Two effects of one card: the quicker one's glow.
    if (existing) { existing.count++; if (tone === "quick") existing.tone = "quick"; continue; }
    byKey.set(key, {
      key,
      label: duel.ygo.state.getCardData(ref.code)?.name ?? `#${ref.code}`,
      commandType,
      data: exact
        ? { [dataKey]: ref.code, ctrl: ref.ctrl, loc: ref.loc, seq: ref.seq }
        : { [dataKey]: ref.code },
      code: ref.code,
      where,
      count: 1,
      highlight: activate,
      tone,
    });
  }
  return [...byKey.values()];
}

/** The row Space takes: Continue / Don't respond, else the only option there is. */
export function spaceRow(sections: Section[]): OptionRow | null {
  const rows = sections.flatMap((s) => s.rows);
  return rows.find((r) => r.commandType === "Pass") ?? (rows.length === 1 ? rows[0] : null);
}

function phaseRow(label: string, phase: string): OptionRow {
  return { key: `phase:${phase}`, label, commandType: "Duel Phase", data: { phase }, count: 1, highlight: false };
}

/** The name of the card whose effect is on top of the chain (the one a response answers). */
export function chainTopName(duel: YGODuel, chain: CardRefData[] | undefined): string | undefined {
  const top = chain?.[chain.length - 1];
  return top ? duel.ygo.state.getCardData(top.code)?.name : undefined;
}

export function sectionsFor(duel: YGODuel, result: AssistQueryResult): Section[] {
  if (!result.available || result.pending === "prompt") return [];
  if (result.pending === "chain") {
    const rows = cardRows(duel, result.respond.activatable, "Activate", "id", true, () => "quick");
    const { chainLength } = result.respond;
    if (result.respond.canPass) {
      rows.push({ key: "pass", label: passLabel(chainLength), commandType: "Pass", data: {}, count: 1, highlight: false });
    }
    return [{ title: respondSectionTitle(chainLength, chainTopName(duel, result.respond.chain)), rows }];
  }
  const nextPhaseSection: Section = {
    title: "Next Phase",
    rows: result.nextPhase ? [phaseRow(phaseLabel(result.nextPhase), result.nextPhase)] : [],
  };

  if (result.pending === "idle") {
    const { options } = result;
    return [
      { title: "Activate", rows: cardRows(duel, options.activatable, "Activate", "id", true, (i) => ((options.activatableSpeed?.[i] ?? 1) >= 2 ? "quick" : "play")) },
      // By origin (Extra Deck first), each row that exact copy; Extra Deck rows name their summon.
      ...groupSpecialSummons(options.spSummon).map((g) => ({
        title: `Special Summon · ${g.label}`,
        rows: cardRows(duel, g.refs, "Special Summon", "id", false, undefined, {
          exact: true,
          tag: g.label === "Extra Deck" ? (code: number) => extraDeckSummonKind(duel.ygo.state.getCardData(code)?.type) : undefined,
        }),
      })),
      { title: "Normal Summon", rows: cardRows(duel, options.summonable, "Normal Summon", "id") },
      { title: "Set Monster", rows: cardRows(duel, options.mset, "Set Monster", "id") },
      { title: "Set Spell/Trap", rows: cardRows(duel, options.sset, "Set ST", "id") },
      { title: "Change Position", rows: cardRows(duel, options.reposition, "Change Card Position", "id") },
      nextPhaseSection,
    ].filter((s) => s.rows.length > 0);
  }

  const options = (result as { options: BattleOptions }).options;
  return [
    // The Battle Phase only allows Spell Speed 2+.
    { title: "Activate", rows: cardRows(duel, options.activatable, "Activate", "id", true, () => "quick") },
    { title: "Attack", rows: cardRows(duel, options.attackable, "Attack", "attackingId") },
    nextPhaseSection,
  ].filter((s) => s.rows.length > 0);
}
