/**
 * Duel Coach (bot / solo engine duels only): the shapes the server answers with
 * (ygo-socket-server duel:assist:query's `coach`, duel:coach:preview, duel:coach:suggest)
 * and the pure helpers the UI draws them with. Types + functions only; shared by core/ and ui/.
 */

import type { CoachOppAnswers } from "../types";

/** An option exactly as duel:assist:choose would take it. */
export interface CoachAction {
  commandType: string;
  data: unknown;
}

/** "Players chose this": the learned choice model's share for one of the human's options. */
export interface CoachHint {
  action: CoachAction;
  /** 0..1 */
  share: number;
}

/** Engine check of a response option on the bot's turn: how many of its cards it denies (>0 only). */
export interface CoachResponse {
  action: CoachAction;
  denies: number;
}

/** The `coach` field of an assist query result (only sent with the coach on). */
export interface CoachHints {
  hints: CoachHint[];
  model: "replays";
  responses?: CoachResponse[];
}

export interface CoachPreviewOption {
  action: CoachAction;
  /** LP change once the option's chain resolves (negative = loss). */
  lp: { self: number; opp: number };
  /** Opponent cards that get a new activation / response window because of it. */
  opens: Array<{ code: number; name: string }>;
  note?: string;
}

export type CoachPreview = { available: false } | { available: true; options: CoachPreviewOption[] };

export type CoachSuggestion =
  | { available: false; reason: string }
  | { available: true; steps: string[]; end: { interruptions: number; now: number }; ms: number };

/** Structural equality of two JSON-like values (key order doesn't matter). */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const other = b as unknown[];
    return a.length === other.length && a.every((value, i) => deepEqual(value, other[i]));
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const keys = Object.keys(ao).filter((k) => ao[k] !== undefined);
  const otherKeys = Object.keys(bo).filter((k) => bo[k] !== undefined);
  return keys.length === otherKeys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(bo, k) && deepEqual(ao[k], bo[k]));
}

/**
 * Whether a server action (hint / preview option, `a`) is the panel row's (`b`): same command, and
 * every field the row sends equal in the server's. The server names the exact copy
 * (`{ id, ctrl, loc, seq }`, an effect's `desc` / `nth`); rows that group copies send only the code
 * (`{ id }`, `{ attackingId }`), so the server's extra fields don't count.
 */
export function sameAction(a: CoachAction, b: CoachAction): boolean {
  if (a.commandType !== b.commandType) return false;
  const row = b.data;
  if (!row || typeof row !== "object" || Array.isArray(row)) return deepEqual(a.data, row);
  const server = (a.data ?? {}) as Record<string, unknown>;
  if (typeof server !== "object") return false;
  return Object.entries(row as Record<string, unknown>).every(([k, v]) => v === undefined || deepEqual(server[k], v));
}

function isAction(value: unknown): value is CoachAction {
  return !!value && typeof value === "object" && typeof (value as { commandType?: unknown }).commandType === "string";
}

/** The query result's coach hints, or null when there are none / they're malformed. */
export function coachHintsOf(result: unknown): CoachHint[] | null {
  const coach = (result as { coach?: { hints?: unknown } } | null | undefined)?.coach;
  if (!coach || !Array.isArray(coach.hints)) return null;
  const hints = coach.hints.filter((h): h is CoachHint =>
    !!h && typeof h === "object" && isAction((h as CoachHint).action) && typeof (h as CoachHint).share === "number" && Number.isFinite((h as CoachHint).share));
  return hints.length ? hints : null;
}

/** The action exactly (deep-equal), when the server sent it as the row sends it. */
function exactly(a: CoachAction, b: CoachAction): boolean {
  return a.commandType === b.commandType && deepEqual(a.data, b.data);
}

/**
 * The row's hint. A row that groups copies (`{ id }`) or one attacker's several Attack options can
 * match several server hints: an exact match wins, otherwise their shares add up (it's one row).
 */
export function hintFor(hints: CoachHint[] | null | undefined, action: CoachAction): CoachHint | null {
  if (!hints?.length) return null;
  const exact = hints.find((h) => exactly(h.action, action));
  if (exact) return exact;
  const matches = hints.filter((h) => sameAction(h.action, action));
  if (matches.length <= 1) return matches[0] ?? null;
  return { action, share: Math.min(1, matches.reduce((total, h) => total + h.share, 0)) };
}

/** Same LP changes, same opened cards, same note: one set of tags fits them all. */
function samePreview(a: CoachPreviewOption, b: CoachPreviewOption): boolean {
  const names = (o: CoachPreviewOption) => [...new Set(o.opens.map((c) => c.name))].sort();
  return a.lp.self === b.lp.self && a.lp.opp === b.lp.opp && (a.note ?? "") === (b.note ?? "") && deepEqual(names(a), names(b));
}

export function parsePreview(res: unknown): CoachPreview {
  const r = res as { available?: unknown; options?: unknown } | null | undefined;
  if (!r || r.available !== true || !Array.isArray(r.options)) return { available: false };
  const options = r.options.filter((o): o is CoachPreviewOption =>
    !!o && typeof o === "object" && isAction((o as CoachPreviewOption).action)).map((o) => ({
    action: o.action,
    lp: { self: Number(o.lp?.self) || 0, opp: Number(o.lp?.opp) || 0 },
    opens: Array.isArray(o.opens) ? o.opens.filter((c) => c && typeof c.name === "string") : [],
    ...(typeof o.note === "string" && o.note ? { note: o.note } : {}),
  }));
  return { available: true, options };
}

export function previewFor(preview: CoachPreview | null | undefined, action: CoachAction): CoachPreviewOption | null {
  if (!preview || !preview.available) return null;
  const exact = preview.options.find((o) => exactly(o.action, action));
  if (exact) return exact;
  const matches = preview.options.filter((o) => sameAction(o.action, action));
  // Several options behind one row (copies, attack targets): tags only when they all say the same.
  return matches.length && matches.every((o) => samePreview(o, matches[0])) ? matches[0] : null;
}

export function parseSuggestion(res: unknown): CoachSuggestion {
  const r = res as { available?: unknown; reason?: unknown; steps?: unknown; end?: { interruptions?: unknown; now?: unknown }; ms?: unknown } | null | undefined;
  if (r?.available === true && Array.isArray(r.steps)) {
    return {
      available: true,
      steps: r.steps.filter((s): s is string => typeof s === "string"),
      end: { interruptions: Number(r.end?.interruptions) || 0, now: Number(r.end?.now) || 0 },
      ms: Number(r.ms) || 0,
    };
  }
  return { available: false, reason: typeof r?.reason === "string" && r.reason ? r.reason : "No suggestion right now." };
}

const MINUS = "−";

/** "players chose this 62%" */
export function shareTag(share: number): string {
  return `players chose this ${Math.round(Math.max(0, Math.min(1, share)) * 100)}%`;
}

/** "−1850 LP" / "+500 LP" */
export function lpText(delta: number): string {
  const n = Math.round(delta);
  return `${n < 0 ? MINUS : "+"}${Math.abs(n)} LP`;
}

/** The small tags on an options-panel row: the hint's share, then the preview's LP changes and what it opens. */
export function coachTags(action: CoachAction, hints: CoachHint[] | null | undefined, preview: CoachPreview | null | undefined): string[] {
  const tags: string[] = [];
  const hint = hintFor(hints, action);
  if (hint) tags.push(shareTag(hint.share));
  const option = previewFor(preview, action);
  if (option) {
    if (option.lp.self) tags.push(`you ${lpText(option.lp.self)}`);
    if (option.lp.opp) tags.push(`them ${lpText(option.lp.opp)}`);
    const names = [...new Set(option.opens.map((c) => c.name))];
    if (names.length) tags.push(`opens ${names.join(", ")}`);
    if (option.note) tags.push(option.note);
    if (!option.lp.self && !option.lp.opp && !names.length && !option.note) tags.push("opens nothing");
  }
  return tags;
}

/** The decision a preview belongs to: the same pending + options (coach hints aside). */
export function decisionKey(result: unknown): string | null {
  const r = result as { available?: boolean; pending?: string; options?: unknown; respond?: unknown; prompt?: unknown } | null | undefined;
  if (!r || !r.available) return null;
  try {
    return JSON.stringify([r.pending, r.options ?? r.respond ?? r.prompt ?? null]);
  } catch {
    return null;
  }
}

/** A preview is only offered for the human's own idle / battle decision. */
export function canPreview(result: unknown): boolean {
  const pending = (result as { available?: boolean; pending?: string } | null | undefined);
  return !!pending?.available && (pending.pending === "idle" || pending.pending === "battle");
}

/** "52% of 1,234" / "no games yet" */
export function winRateText(record: { games: number; wins: number } | null | undefined): string {
  if (!record || !record.games) return "no games yet";
  return `${Math.round((record.wins / record.games) * 100)}% of ${record.games.toLocaleString("en-US")}`;
}

export function percent(share: number): string {
  return `${Math.round(Math.max(0, Math.min(1, share)) * 100)}%`;
}

/** "End board: 3 interruptions (now 1)" */
export function endBoardText(end: { interruptions: number; now: number }): string {
  return `End board: ${end.interruptions} interruption${end.interruptions === 1 ? "" : "s"} (now ${end.now})`;
}

/** The query result's response checks (chain windows on the bot's turn), or null. */
export function coachResponsesOf(result: unknown): CoachResponse[] | null {
  const responses = (result as { coach?: { responses?: unknown } } | null | undefined)?.coach?.responses;
  if (!Array.isArray(responses)) return null;
  const valid = responses.filter((r): r is CoachResponse =>
    !!r && typeof r === "object" && isAction((r as CoachResponse).action) && typeof (r as CoachResponse).denies === "number" && (r as CoachResponse).denies > 0);
  return valid.length ? valid : null;
}

/** The row's denial count: an exact match, else the matches when they all agree. */
export function deniesFor(responses: CoachResponse[] | null | undefined, action: CoachAction): number | null {
  if (!responses?.length) return null;
  const exact = responses.find((r) => exactly(r.action, action));
  if (exact) return exact.denies;
  const matches = responses.filter((r) => sameAction(r.action, action));
  return matches.length && matches.every((r) => r.denies === matches[0].denies) ? matches[0].denies : null;
}

type Record2 = { games: number; wins: number };
const rate = (r: Record2) => `${Math.round((r.wins / r.games) * 100)}%`;
const hasGames = (r: Record2 | null | undefined): r is Record2 => !!r && r.games > 0;

/** The opponent's card on top of the chain, when it's theirs (`me`: the human's player index). */
export function opponentChainTop(result: unknown, me: number): { code: number; ctrl: number } | null {
  const r = result as { available?: boolean; pending?: string; respond?: { chain?: Array<{ code?: unknown; ctrl?: unknown }> } } | null | undefined;
  if (!r?.available || r.pending !== "chain") return null;
  const top = r.respond?.chain?.[r.respond.chain.length - 1];
  if (!top || typeof top.code !== "number" || typeof top.ctrl !== "number" || top.ctrl === me) return null;
  return { code: top.code, ctrl: top.ctrl };
}

/**
 * Tags for one of the human's Activate rows (card `code`) answering the opponent's chain top `target`:
 * the replay stats (the bot deck's win rate in games where that happened, never "stops them"), then
 * the engine's denial count.
 */
export function responseTags(
  code: number | undefined,
  target: number,
  opp: CoachOppAnswers | null | undefined,
  denies: number | null,
): string[] {
  const tags: string[] = [];
  if (code !== undefined && opp) {
    const answer = opp.answers?.find((a) => a.answer.code === code && a.target.code === target && a.games > 0);
    const choke = opp.chokePoints?.find((c) => c.code === target && c.games > 0);
    if (answer) {
      const clean = hasGames(opp.clean) ? ` · ${rate(opp.clean)} uninterrupted` : "";
      tags.push(`they won ${rate(answer)} when ${answer.answer.name} answered ${answer.target.name} (${answer.games.toLocaleString("en-US")} games)${clean}`);
    } else if (choke) {
      tags.push(`${choke.name} is their choke point: ${rate(choke)} when answered`);
    }
  }
  if (denies && denies > 0) tags.push(`denies them ${denies} card${denies === 1 ? "" : "s"}`);
  return tags;
}
