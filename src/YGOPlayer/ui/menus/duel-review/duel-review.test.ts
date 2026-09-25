import { describe, expect, it } from "vitest";
import { formatScore, isShowableReview, momentTitle, percent, reviewHeadline, reviewSourceOf, reviewSubline, unavailableText, PlayReview, ReviewMoment } from "./duel-review";

const moment: ReviewMoment = {
  seq: 4,
  turn: 3,
  ctx: "chain",
  chosen: { label: "Don't respond", kind: "pass", code: 0, score: -0.4, prob: 0.1 },
  best: { label: "Activate Ash Blossom", kind: "activate", code: 14558127, score: 1.25, prob: 0.85 },
  alternatives: [],
  gap: 0.75,
};
const review: PlayReview = { modelId: "v2", decisions: 20, agreed: 14, agreement: 0.7, meanGap: 0.1, keyMoments: [moment] };

describe("reviewSourceOf", () => {
  it("uses the host's assist.review when there is one", async () => {
    const assist = { calls: 0, review() { this.calls++; return Promise.resolve({ available: false }); } };
    const source = reviewSourceOf({ assist });
    expect(source).not.toBeNull();
    await expect(source!.review()).resolves.toEqual({ available: false });
    expect(assist.calls).toBe(1);
  });

  it("is null without one", () => {
    expect(reviewSourceOf({})).toBeNull();
    expect(reviewSourceOf({ assist: { query() { }, choose() { } } })).toBeNull();
  });
});

describe("isShowableReview", () => {
  const ok = { available: true, roomId: "r", game: 1, outcome: { winner: "bot", loser: "human" }, turns: 5, difficulty: "strong", review };
  it("accepts an available review with scored decisions", () => {
    expect(isShowableReview(ok)).toBe(true);
  });
  it("rejects unavailable, empty or malformed answers", () => {
    expect(isShowableReview({ available: false, reason: "no-log" })).toBe(false);
    expect(isShowableReview({ ...ok, review: { ...review, decisions: 0 } })).toBe(false);
    expect(isShowableReview({ ...ok, review: { ...review, keyMoments: undefined } })).toBe(false);
    expect(isShowableReview(null)).toBe(false);
  });
});

describe("wording", () => {
  it("summarises agreement and key moments", () => {
    expect(reviewHeadline(review)).toBe("You made the model's top pick in 14 of 20 decisions (70%).");
    expect(reviewSubline(review)).toBe("1 key moment where the model preferred a different option:");
    expect(reviewSubline({ ...review, keyMoments: [moment, moment] })).toMatch(/^2 key moments/);
    expect(reviewSubline({ ...review, keyMoments: [] })).toMatch(/^No moment/);
    expect(reviewHeadline({ ...review, decisions: 0 })).toBe("No decisions to review.");
  });

  it("formats moments, scores and percentages", () => {
    expect(momentTitle(moment)).toBe("Turn 3 · Chain response");
    expect(momentTitle({ ...moment, ctx: "main" })).toBe("Turn 3 · Main Phase");
    expect(formatScore(1.254)).toBe("+1.25");
    expect(formatScore(-0.4)).toBe("-0.40");
    expect(formatScore(NaN)).toBe("–");
    expect(percent(0.854)).toBe("85%");
    expect(percent(1.2)).toBe("100%");
  });

  it("explains why a review is unavailable", () => {
    expect(unavailableText("no-log")).toBe("No review for this duel.");
    expect(unavailableText("whatever")).toBe("The review isn't available right now.");
  });
});
