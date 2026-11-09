/**
 * Duel Coach, live: what the coach panel's "Right now" box and outlook line say, read from the
 * duel as it goes (its log, the field, the engine's current decision). Types + pure functions only.
 */
import type { CoachOppAnswers, CoachStats } from "../types";

type Rec = { games: number; wins: number };
/** Fewer games than this is noise: the coach doesn't quote it. */
export const MIN_GAMES = 30;
const hasGames = (r: Rec | null | undefined): r is Rec => !!r && r.games >= MIN_GAMES;
const pct = (r: Rec) => `${Math.round((r.wins / r.games) * 100)}%`;
const games = (n: number) => `${n.toLocaleString("en-US")} game${n === 1 ? "" : "s"}`;

/** C(n, k) as a float (small n). */
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

/** The chance at least one of `copies` copies is among `hand` unknown cards out of a `pool` of unknown cards. */
export function atLeastOne(copies: number, hand: number, pool: number): number {
  if (copies <= 0 || hand <= 0 || pool <= 0) return 0;
  if (copies >= pool || hand >= pool) return 1;
  return 1 - choose(pool - copies, hand) / choose(pool, hand);
}

export interface OppView {
  /** Cards in their hand now. */
  handSize: number;
  /** Cards left in their Main Deck. */
  deckSize: number;
  /** Copies of each card code they have shown (on the field, in the GY, banished). */
  shown: ReadonlyMap<number, number>;
}

export interface HeldChance {
  name: string;
  code?: number;
  chance: number;
  /** Copies of it they have already shown. */
  shown: number;
}

/**
 * The hand traps they may hold now: each copy count of the deck type's lists, minus the copies
 * they've shown, spread over the cards they haven't shown (hand + deck). Without `dist` the
 * opening-hand chance stays as it is.
 */
export function liveHandTraps(traps: CoachStats["oppHandTraps"], view: OppView | null): HeldChance[] {
  if (!traps?.length) return [];
  return traps
    .map((t) => {
      const shown = t.code !== undefined ? view?.shown.get(t.code) ?? 0 : 0;
      if (!view || !t.dist?.length) return { name: t.name, code: t.code, chance: t.chance, shown };
      const pool = view.handSize + view.deckSize;
      const chance = t.dist.reduce((sum, d) => sum + d.share * atLeastOne(Math.max(0, d.copies - shown), view.handSize, pool), 0);
      return { name: t.name, code: t.code, chance: Math.max(0, Math.min(1, chance)), shown };
    })
    .filter((h) => h.chance >= 0.01)
    .sort((a, b) => b.chance - a.chance);
}

/** The Main Phase 1 warning about the likeliest hand trap ("" when none is likely enough). */
export function handTrapWarning(held: HeldChance[], minChance = 0.25): string {
  const top = held[0];
  if (!top || top.chance < minChance) return "";
  return `~${Math.round(top.chance * 100)}% they hold ${top.name}: lead with the card you can best afford to lose to it.`;
}

export interface Blocker {
  /** Face-up: its ATK / DEF; face-down: unknown. */
  atk: number;
  def: number;
  position: "attack" | "defense" | "facedown";
}

export interface LethalCheck {
  /** The most battle damage the attackers can deal, before any card effects. */
  damage: number;
  lethal: boolean;
  oppLp: number;
  /** The count assumes their face-down monsters go down to any attacker. */
  assumesFaceDown: boolean;
}

/**
 * The most battle damage `attackers` (ATK values) can deal into `blockers` before effects: each
 * attacker attacks once, into a monster it beats (or ties in ATK), or directly once every monster
 * is gone. Small fields only (5 + 2 each side), searched exhaustively.
 */
export function lethalCheck(attackers: number[], blockers: Blocker[], oppLp: number): LethalCheck | null {
  if (!attackers.length) return null;
  const n = attackers.length;
  let best = 0;
  // choice[i]: -1 = attack directly / don't attack, j = attack blocker j.
  const choice = new Array<number>(n).fill(-1);
  const assumesFaceDown = blockers.some((b) => b.position === "facedown");
  const evaluate = () => {
    const destroyed = new Array<boolean>(blockers.length).fill(false);
    let dmg = 0;
    for (let i = 0; i < n; i++) {
      const j = choice[i];
      if (j < 0) continue;
      const b = blockers[j];
      if (destroyed[j]) return; // a monster can't be attacked twice usefully
      const atk = attackers[i];
      if (b.position === "attack") {
        if (atk < b.atk) return;
        dmg += atk - b.atk;
      } else if (b.position === "defense") {
        if (atk <= b.def) return;
      }
      destroyed[j] = true;
    }
    if (destroyed.every(Boolean)) for (let i = 0; i < n; i++) if (choice[i] < 0) dmg += attackers[i];
    if (dmg > best) best = dmg;
  };
  const walk = (i: number) => {
    if (i === n) { evaluate(); return; }
    for (let j = -1; j < blockers.length; j++) { choice[i] = j; walk(i + 1); }
  };
  walk(0);
  return { damage: best, lethal: best >= oppLp && oppLp > 0, oppLp, assumesFaceDown };
}

export function lethalText(c: LethalCheck): string {
  const fd = c.assumesFaceDown ? ", if their face-downs go" : "";
  return c.lethal
    ? `Lethal: you can deal ${c.damage.toLocaleString("en-US")} and they have ${c.oppLp.toLocaleString("en-US")} LP (before effects${fd}).`
    : `You can deal up to ${c.damage.toLocaleString("en-US")} of their ${c.oppLp.toLocaleString("en-US")} LP (before effects${fd}).`;
}

/** What the duel log has told the coach so far. */
export interface DuelStory {
  /** Who went first (ygo-core player index), when known. */
  goingFirst: number | null;
  /** The turn now. */
  turn: number;
  /** Your activations during their turn 1 (they went first). */
  interruptedTheirTurn1: number;
  /** Cards they activated during your turn 1 (you went first), codes in order. */
  hitYouTurn1: number[];
}

type LogLike = { type?: unknown; player?: unknown; id?: unknown; turn?: unknown; turnPlayer?: unknown; goingFirst?: unknown };

/** Reads the duel log (`me`: your player index; `fallbackFirst`: the duel options' going-first player). */
export function readStory(logs: readonly LogLike[] | null | undefined, me: number, fallbackFirst: number | null, turnNow: number): DuelStory {
  let goingFirst: number | null = null;
  let turn = 1;
  let turnPlayer: number | null = null;
  let interrupted = 0;
  const hits: number[] = [];
  for (const log of logs ?? []) {
    if (log.type === "Turn Order" && typeof log.goingFirst === "number") goingFirst = log.goingFirst;
    else if ((log.type === "DuelTurn" || log.type === "DuelPhase") && typeof log.turn === "number") {
      turn = log.turn;
      if (typeof log.turnPlayer === "number") {
        turnPlayer = log.turnPlayer;
        if (goingFirst === null && log.turn === 1) goingFirst = log.turnPlayer;
      }
    } else if (log.type === "Activate" && typeof log.player === "number" && turn === 1) {
      const first = goingFirst ?? turnPlayer ?? fallbackFirst;
      if (first === null) continue;
      if (first !== me && log.player === me) interrupted++;
      else if (first === me && log.player !== me && typeof log.id === "number") hits.push(log.id);
    }
  }
  return { goingFirst: goingFirst ?? fallbackFirst, turn: Math.max(turn, turnNow), interruptedTheirTurn1: interrupted, hitYouTurn1: hits };
}

/** The interruption bucket label the replay stats use ("0", "1", "2", "3+"). */
const bucket = (n: number) => (n >= 3 ? "3+" : String(n));

/**
 * The running outlook: the replay win rate for where this duel is, as one line. Stats are "in games
 * like this", never a promise. Null when there's nothing to say.
 */
export function outlookLine(stats: CoachStats | null, story: DuelStory, me: number): string | null {
  if (!stats || story.goingFirst === null) return null;
  const youFirst = story.goingFirst === me;
  const deck = stats.deckType?.name ?? "Your deck";
  const opp: CoachOppAnswers | null | undefined = stats.oppAnswers;

  // They went first and their turn 1 is over: how their deck does after that many interruptions.
  if (!youFirst && story.turn >= 2 && opp) {
    const n = story.interruptedTheirTurn1;
    const row = opp.byInterruptions?.find((b) => b.label === bucket(n));
    const rec = row && hasGames(row) ? row : n > 0 ? opp.interrupted : opp.clean;
    if (hasGames(rec)) {
      const what = n === 0 ? "You didn't interrupt their turn 1" : `You interrupted their turn 1 ${n === 1 ? "once" : `${n} times`}`;
      return `${what}: ${opp.deckType} won ${pct(rec)} of games like this (${games(rec.games)}).`;
    }
  }

  // You went first and their answers on your turn 1 are in.
  if (youFirst && story.turn >= 2) {
    const hit = story.hitYouTurn1.map((code) => stats.stoppedBy?.find((s) => s.code === code)).find((s) => s && hasGames(s));
    if (hit) return `They hit you with ${hit.name} on turn 1: ${deck} won ${pct(hit)} of those games (${games(hit.games)}).`;
  }

  const m = stats.matchup;
  const vs = m ? (youFirst ? m.first : m.second) : undefined;
  if (m && hasGames(vs)) return `Going ${youFirst ? "first" : "second"} vs ${m.vs}: ${deck} won ${pct(vs)} (${games(vs.games)}).`;
  const base = youFirst ? stats.goingFirst : stats.goingSecond;
  if (hasGames(base)) return `Going ${youFirst ? "first" : "second"}: ${deck} won ${pct(base)} (${games(base.games)}).`;
  return null;
}

/** "Faimena is their key card": the opponent's chain top is one of their deck type's choke points. */
export function keyCardNote(target: number, opp: CoachOppAnswers | null | undefined): string | null {
  const choke = opp?.chokePoints?.find((c) => c.code === target && c.games > 0);
  return choke ? `${choke.name} is a key card for them: ${opp!.deckType} won ${pct(choke)} when it was answered.` : null;
}
