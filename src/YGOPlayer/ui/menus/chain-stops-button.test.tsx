import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CHAIN_STOP_BADGE, ChainStopsButton, firstPickOf, nextChainStops } from "./chain-stops-button";

const duelWith = (value: "off" | "auto" | "always" | "bluff", continuousAccept = false) =>
  ({ chainStops: { value, set: () => {} }, continuousAccept }) as never;

describe("<ChainStopsButton>", () => {
  it("shows the mode as the button's badge, Master Duel style", () => {
    expect(CHAIN_STOP_BADGE).toEqual({ off: "OFF", auto: "AUTO", always: "ON", bluff: "BLUFF" });
    const html = renderToStaticMarkup(<ChainStopsButton duel={duelWith("always")} />);
    expect(html).toContain('aria-label="Chain stops: ON. Click for the next mode, right-click for the previous"');
    expect(html).toContain(">ON</span>");
    // No menu: the button itself changes the mode.
    expect(html).not.toContain('role="radiogroup"');
  });

  it("shows OFF while OK is held", () => {
    expect(renderToStaticMarkup(<ChainStopsButton duel={duelWith("auto", true)} />)).toContain('aria-label="Chain stops: OFF. Click for the next mode, right-click for the previous"');
  });

  it("is hidden outside Assisted Mode duels", () => {
    expect(renderToStaticMarkup(<ChainStopsButton duel={{ chainStops: null } as never} />)).toBe("");
  });

  it("left click moves Off → On → Auto → Bluff → Off; right click goes back", () => {
    expect(["off", "always", "auto", "bluff"].map((m) => nextChainStops(m as never))).toEqual(["always", "auto", "bluff", "off"]);
    expect(["off", "always", "auto", "bluff"].map((m) => nextChainStops(m as never, -1))).toEqual(["bluff", "off", "always", "auto"]);
  });

  it("shows each mode's hint only the first time it is picked", () => {
    const data = new Map<string, string>();
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    expect(firstPickOf("always", storage)).toBe(true);
    expect(firstPickOf("always", storage)).toBe(false);
    expect(firstPickOf("off", storage)).toBe(true);
    expect(firstPickOf("off", storage)).toBe(false);
  });
});
