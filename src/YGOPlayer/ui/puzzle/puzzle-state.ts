/**
 * The puzzle HUD's state: ygo-socket-server's PuzzleView (src/puzzles/types.ts),
 * first from the duel's options (rules.puzzle) and then from `puzzle:state`
 * events, which carry the engine's verdict.
 */

export type PuzzleGoal = { type: "win" } | { type: "damage"; amount: number };
export type PuzzleStatus = "playing" | "solved" | "failed";
export type PuzzleOpponentPolicy = "pass" | "bot" | "eager";

export interface PuzzleView {
  roomId: string;
  puzzleId: string;
  name: string;
  description: string;
  difficulty: number;
  goal: PuzzleGoal;
  goalText: string;
  opponentPolicy: PuzzleOpponentPolicy;
  hint?: string;
  status: PuzzleStatus;
  reason?: string;
  damageDealt: number;
  attempt: number;
}

const STATUSES = new Set<PuzzleStatus>(["playing", "solved", "failed"]);
const POLICIES = new Set<PuzzleOpponentPolicy>(["pass", "bot", "eager"]);

function readGoal(value: unknown): PuzzleGoal | null {
  const goal = value as { type?: unknown; amount?: unknown } | null;
  if (goal?.type === "win") return { type: "win" };
  if (goal?.type === "damage" && typeof goal.amount === "number" && goal.amount > 0) return { type: "damage", amount: goal.amount };
  return null;
}

/** A PuzzleView from untrusted data, or null. */
export function readPuzzleView(value: unknown): PuzzleView | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const goal = readGoal(v.goal);
  if (typeof v.roomId !== "string" || typeof v.puzzleId !== "string" || !goal) return null;
  if (!STATUSES.has(v.status as PuzzleStatus)) return null;
  return {
    roomId: v.roomId,
    puzzleId: v.puzzleId,
    name: typeof v.name === "string" ? v.name : "Puzzle",
    description: typeof v.description === "string" ? v.description : "",
    difficulty: typeof v.difficulty === "number" ? v.difficulty : 1,
    goal,
    goalText: typeof v.goalText === "string" && v.goalText ? v.goalText : goal.type === "win" ? "Win this turn" : `Deal ${goal.amount} damage this turn`,
    opponentPolicy: POLICIES.has(v.opponentPolicy as PuzzleOpponentPolicy) ? (v.opponentPolicy as PuzzleOpponentPolicy) : "pass",
    ...(typeof v.hint === "string" && v.hint ? { hint: v.hint } : {}),
    status: v.status as PuzzleStatus,
    ...(typeof v.reason === "string" && v.reason ? { reason: v.reason } : {}),
    damageDealt: typeof v.damageDealt === "number" && v.damageDealt > 0 ? v.damageDealt : 0,
    attempt: typeof v.attempt === "number" && v.attempt >= 1 ? v.attempt : 1,
  };
}

/**
 * Applies a `puzzle:state` event: only for this puzzle's room and attempt,
 * and a decided puzzle stays decided (the server's first verdict is final).
 */
export function nextPuzzleView(current: PuzzleView | null, incoming: unknown): PuzzleView | null {
  const next = readPuzzleView(incoming);
  if (!next) return current;
  if (!current) return next;
  if (next.roomId !== current.roomId || next.attempt < current.attempt) return current;
  if (current.status !== "playing" && next.attempt === current.attempt) return current;
  return next;
}

/** Damage progress for a damage goal ("1200 / 3000"), or null. */
export function puzzleProgress(view: PuzzleView): { dealt: number; target: number; ratio: number; label: string } | null {
  if (view.goal.type !== "damage") return null;
  const target = view.goal.amount;
  const dealt = Math.min(view.damageDealt, target);
  return { dealt, target, ratio: target > 0 ? dealt / target : 0, label: `${view.damageDealt} / ${target} damage` };
}

export function opponentPolicyText(policy: PuzzleOpponentPolicy): string {
  switch (policy) {
    case "bot": return "Your opponent may respond.";
    case "eager": return "Your opponent will use their cards.";
    default: return "Your opponent won't respond.";
  }
}

export function puzzleResultTitle(view: PuzzleView): string | null {
  if (view.status === "solved") return "Solved!";
  if (view.status === "failed") return "Not this time";
  return null;
}

/** What the HUD hands its host for Try again (a new room: see ygo-socket-server puzzle:retry). */
export interface PuzzleRetryRequest {
  roomId: string;
  puzzleId: string;
  attempt: number;
}

export function retryRequestOf(view: PuzzleView): PuzzleRetryRequest {
  return { roomId: view.roomId, puzzleId: view.puzzleId, attempt: view.attempt };
}
