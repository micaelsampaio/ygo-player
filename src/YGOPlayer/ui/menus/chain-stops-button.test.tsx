import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CHAIN_STOP_BADGE, ChainStopsButton, nextChainStops } from "./chain-stops-button";

const duelWith = (value: "off" | "auto" | "always" | "bluff", continuousAccept = false) =>
  ({ chainStops: { value, set: () => {} }, continuousAccept }) as never;

describe("<ChainStopsButton>", () => {
  it("shows the mode as the button's badge, Master Duel style", () => {
    expect(CHAIN_STOP_BADGE).toEqual({ off: "OFF", auto: "AUTO", always: "ON", bluff: "BLUFF" });
    const html = renderToStaticMarkup(<ChainStopsButton duel={duelWith("always")} />);
    expect(html).toContain('aria-label="Chain stops: ON. Tap to change"');
    expect(html).toContain(">ON</span>");
    // No menu: the button itself changes the mode.
    expect(html).not.toContain('role="radiogroup"');
  });

  it("shows OFF while OK is held", () => {
    expect(renderToStaticMarkup(<ChainStopsButton duel={duelWith("auto", true)} />)).toContain('aria-label="Chain stops: OFF. Tap to change"');
  });

  it("is hidden outside Assisted Mode duels", () => {
    expect(renderToStaticMarkup(<ChainStopsButton duel={{ chainStops: null } as never} />)).toBe("");
  });

  it("cycles Off → Auto → On → Bluff → Off on each tap", () => {
    expect(["off", "auto", "always", "bluff"].map((m) => nextChainStops(m as never))).toEqual(["auto", "always", "bluff", "off"]);
  });
});
