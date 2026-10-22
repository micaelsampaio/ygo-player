import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PlayerRemoteActionsComponent } from "./player-actions";

const fakeDuel = (options: Record<string, unknown>) => ({
  ygo: { options },
  continuousAccept: false,
  chainStops: undefined,
  events: { on: () => {}, off: () => {} },
}) as any;

describe("PlayerRemoteActionsComponent", () => {
  it("offers OK, Think and Wait against a person", () => {
    const html = renderToStaticMarkup(<PlayerRemoteActionsComponent duel={fakeDuel({})} />);
    expect(html).toContain('aria-label="Thinking"');
    expect(html).toContain('aria-label="Wait"');
  });

  it("drops Think and Wait against the bot", () => {
    const html = renderToStaticMarkup(<PlayerRemoteActionsComponent duel={fakeDuel({ botDuel: true })} />);
    expect(html).toContain("Pass / OK");
    expect(html).not.toContain('aria-label="Thinking"');
  });

  it("is a single floating OK button on phones", () => {
    const html = renderToStaticMarkup(<PlayerRemoteActionsComponent duel={fakeDuel({})} compact />);
    expect(html).toContain("ygo-floating-button");
    expect(html).not.toContain('aria-label="Wait"');
  });
});
