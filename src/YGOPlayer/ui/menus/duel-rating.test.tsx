import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DuelRating, RATING_REASONS, canRateDuel } from "./duel-rating";

const duelWith = (botDuel: boolean, rate?: () => Promise<unknown>) =>
  ({ ygo: { options: { botDuel } }, assist: rate ? { rate } : undefined, logger: { swallowed: () => {} } }) as never;
const rate = () => Promise.resolve();

describe("<DuelRating>", () => {
  it("is offered only in the player's own bot duels, when the host can send the rating", () => {
    expect(canRateDuel(duelWith(true, rate), true)).toBe(true);
    expect(canRateDuel(duelWith(true, rate), false)).toBe(false);
    expect(canRateDuel(duelWith(false, rate), true)).toBe(false);
    expect(canRateDuel(duelWith(true), true)).toBe(false);
  });

  it("asks with five stars and no reasons until a star is picked", () => {
    const html = renderToStaticMarkup(<DuelRating duel={duelWith(true, rate)} />);
    expect(html).toContain("How was the bot?");
    expect(html.match(/role="radio"/g)).toHaveLength(5);
    expect(html).toContain('aria-label="1 star"');
    expect(html).toContain('aria-label="5 stars"');
    expect(html).not.toContain("Bot played badly");
  });

  it("offers the server's rating reasons", () => {
    expect(RATING_REASONS.map((r) => r.id)).toEqual(["good-duel", "too-hard", "too-easy", "played-badly", "showed-wrong", "stuck", "too-slow"]);
  });
});
