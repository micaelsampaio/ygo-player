import { useEffect, useReducer } from "react";
import type { Card } from "ygo-core";
import type { YGODuel } from "../../core/YGODuel";
import type { AssistQueryResult } from "../../domain/assist-query";
import type { CoachStats } from "../../types";
import { coachResponsesOf, opponentChainTop, responseTags } from "../../domain/coach";
import {
  handTrapWarning, keyCardNote, lethalCheck, lethalText, liveHandTraps, outlookLine, readStory,
  type Blocker, type HeldChance, type OppView,
} from "../../domain/coach-live";
import type { DuelTurnState } from "../use-duel-turn-state";

/** The coach's live read of the duel, for the panel's "Right now" box and outlook line. */
export interface CoachNow {
  outlook: string | null;
  /** The hand traps they may hold now. */
  held: HeldChance[];
  /** One line for the moment you're in (Main Phase 1 warning, lethal check), or null. */
  tip: string | null;
  /** In a chain window on their card: what answering it did in replays, per card you can chain. */
  responses: { target: string; keyNote: string | null; tips: Array<{ name: string; lines: string[] }> } | null;
}

type DuelLike = Pick<YGODuel, "ygo" | "perspective">;

const inPlay = (cards: Array<Card | null | undefined>) => cards.filter((c): c is Card => !!c);
const faceUp = (c: Card) => c.position !== "facedown";

/** Copies of each code the opponent has shown: face-up on the field, in the GY, banished face-up. */
export function shownByOpp(duel: DuelLike, opp: number): OppView | null {
  const f = duel.ygo.state.fields?.[opp];
  if (!f) return null;
  const shown = new Map<number, number>();
  const add = (c: Card) => { if (c.id) shown.set(c.id, (shown.get(c.id) ?? 0) + 1); };
  [...inPlay(f.monsterZone), ...inPlay(f.spellTrapZone), ...inPlay([f.fieldZone]), ...inPlay(f.extraMonsterZone)]
    .filter(faceUp).forEach(add);
  f.graveyard.forEach(add);
  f.banishedZone.filter(faceUp).forEach(add);
  return { handSize: f.hand.length, deckSize: f.mainDeck.length, shown };
}

const monstersOf = (duel: DuelLike, p: number) => {
  const f = duel.ygo.state.fields?.[p];
  return f ? inPlay([...f.monsterZone, ...f.extraMonsterZone]) : [];
};

function blockersOf(duel: DuelLike, opp: number): Blocker[] {
  return monstersOf(duel, opp).map((c) => c.position === "facedown"
    ? { atk: 0, def: 0, position: "facedown" as const }
    : c.position === "faceup-defense"
      ? { atk: c.currentAtk ?? c.atk, def: c.currentDef ?? c.def, position: "defense" as const }
      : { atk: c.currentAtk ?? c.atk, def: c.currentDef ?? c.def, position: "attack" as const });
}

/** Your attackers' ATK: in the Battle Phase the ones the engine lets attack; else every face-up Attack Position monster. */
function attackersOf(duel: DuelLike, me: number, result: AssistQueryResult | null): number[] {
  const mine = monstersOf(duel, me).filter((c) => c.position === "faceup-attack");
  if (result?.available && result.pending === "battle") {
    const left = [...mine];
    return result.options.attackable.flatMap((ref) => {
      const i = left.findIndex((c) => c.id === ref.code);
      if (i < 0) return [];
      const [c] = left.splice(i, 1);
      return [c.currentAtk ?? c.atk];
    });
  }
  return mine.map((c) => c.currentAtk ?? c.atk);
}

/** The coach's read of the duel now (pure: everything comes from `duel` and its current decision). */
export function readCoachNow(duel: DuelLike, stats: CoachStats | null, turn: DuelTurnState, result: AssistQueryResult | null): CoachNow {
  const me = duel.perspective.playerIndex;
  const opp = 1 - me;
  const view = shownByOpp(duel, opp);
  // Their hand traps matter on your turn; on theirs the box is about their plays.
  const held = turn.isLocalTurn && stats?.oppHandTraps ? liveHandTraps(stats.oppHandTraps, view) : [];
  const firstOption = (duel.ygo.options as { goingFirstPlayer?: number } | undefined)?.goingFirstPlayer;
  const story = readStory(duel.ygo.duelLog?.logs as never, me, typeof firstOption === "number" ? firstOption : null, turn.turn);
  const outlook = outlookLine(stats, story, me);

  let tip: string | null = null;
  if (turn.isLocalTurn && turn.phase === "Main Phase 1") {
    tip = handTrapWarning(held) || null;
    // From turn 2 on you can attack: what the board could do this turn.
    if (!tip && turn.turn > 1) {
      const c = lethalCheck(attackersOf(duel, me, null), blockersOf(duel, opp), duel.ygo.state.fields?.[opp]?.lp ?? 0);
      if (c && c.damage > 0) tip = lethalText(c);
    }
  } else if (turn.isLocalTurn && turn.phase === "Battle") {
    const c = lethalCheck(attackersOf(duel, me, result), blockersOf(duel, opp), duel.ygo.state.fields?.[opp]?.lp ?? 0);
    if (c) tip = lethalText(c);
  }

  let responses: CoachNow["responses"] = null;
  const top = result ? opponentChainTop(result, me) : null;
  if (top && result?.available && result.pending === "chain") {
    const name = (code: number) => duel.ygo.state.getCardData(code)?.name ?? `#${code}`;
    const checks = coachResponsesOf(result);
    const seen = new Set<number>();
    const tips = result.respond.activatable.flatMap((ref) => {
      if (seen.has(ref.code)) return [];
      seen.add(ref.code);
      // The engine's Activate payload names the card as `id` (a card ref's `code`).
      const own = (checks ?? []).filter((r) => {
        const d = r.action.data as { id?: unknown; code?: unknown } | null;
        return (d?.id ?? d?.code) === ref.code;
      });
      const denies = own.length && own.every((r) => r.denies === own[0].denies) ? own[0].denies : null;
      const lines = responseTags(ref.code, top.code, stats?.oppAnswers, denies);
      return lines.length ? [{ name: name(ref.code), lines }] : [];
    });
    const keyNote = keyCardNote(top.code, stats?.oppAnswers);
    responses = { target: name(top.code), keyNote, tips };
  }
  return { outlook, held, tip, responses };
}

/** readCoachNow, re-read whenever the engine's decision, the log or the turn changes. */
export function useCoachNow(duel: YGODuel, stats: CoachStats | null, turn: DuelTurnState, active: boolean): CoachNow | null {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!active) return;
    const offOptions = duel.assistController.subscribe(() => bump());
    const onLogs = () => bump();
    duel.events.on("logs-updated", onLogs);
    return () => { offOptions(); duel.events.off("logs-updated", onLogs); };
  }, [duel, active]);
  if (!active) return null;
  const result = duel.assistController.options;
  return readCoachNow(duel, stats, turn, result);
}

/** A coach line for the chat, posted once per key (YGOCoachController.post). */
export interface CoachLine { key: string; text: string }

/**
 * What the coach says now, as chat lines, each keyed by its moment so it's posted once: the
 * outlook (each new one), the bot's deck once the guess is clear (each new leader), the Main
 * Phase 1 warning and the Battle Phase check (once per turn), and their activation's tips.
 */
export function coachLines(now: CoachNow, stats: CoachStats | null, turn: Pick<DuelTurnState, "turn" | "phase">): CoachLine[] {
  const lines: CoachLine[] = [];
  if (now.outlook) lines.push({ key: `outlook:${now.outlook}`, text: now.outlook });
  const top = stats?.oppGuess?.types[0];
  if (top && top.share > 0.5) {
    const seen = stats!.oppGuess!.seen;
    lines.push({ key: `guess:${top.name}`, text: `Their deck looks like ${top.name} (${Math.round(top.share * 100)}% from ${seen} card${seen === 1 ? "" : "s"} seen).` });
  }
  if (now.tip) lines.push({ key: `tip:${turn.turn}:${turn.phase}`, text: now.tip });
  const r = now.responses;
  if (r && (r.keyNote || r.tips.length)) {
    const parts = [r.keyNote, ...r.tips.map((t) => `${t.name}: ${t.lines.join(" · ")}`)].filter(Boolean);
    lines.push({ key: `resp:${turn.turn}:${r.target}:${parts.join("|")}`, text: [`They activated ${r.target}.`, ...parts].join("\n") });
  }
  return lines;
}
