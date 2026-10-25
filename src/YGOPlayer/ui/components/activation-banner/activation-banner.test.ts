import { describe, expect, it } from "vitest";
import { HIDDEN_CARD_ID } from "ygo-core";
import {
  ACTIVATION_BANNER_MS,
  activationBanner,
  activationBannerMs,
  activationTitle,
  isHiddenActivation,
  pushActivationBanner,
} from "./activation-banner";

const on = { isOpponent: true, enabled: true, recovering: false };

describe("activationBanner", () => {
  it("names the opponent's card, with its kind and chain link", () => {
    expect(activationBanner({ cardId: 1, name: "Mirror Force", frameType: "trap", player: 1, chainLink: 2 }, on))
      .toEqual({ kind: "trap", label: "Opponent activated a Trap", name: "Mirror Force", chainLink: 2 });
    expect(activationBanner({ cardId: 2, name: "Pot of Greed", frameType: "spell", player: 1 }, on))
      .toEqual({ kind: "spell", label: "Opponent activated a Spell", name: "Pot of Greed", chainLink: undefined });
    expect(activationBanner({ cardId: 3, name: "Ash Blossom & Joyous Spring", frameType: "effect", player: 1 }, on)?.label)
      .toBe("Opponent activated an effect");
  });

  it("none for the viewer's own side, with the setting off, or while recovering", () => {
    const event = { cardId: 1, name: "Mirror Force", frameType: "trap", player: 0 };
    expect(activationBanner(event, { ...on, isOpponent: false })).toBeNull();
    expect(activationBanner(event, { ...on, enabled: false })).toBeNull();
    expect(activationBanner(event, { ...on, recovering: true })).toBeNull();
  });

  it("never names a card the viewer can't see", () => {
    expect(isHiddenActivation({ cardId: HIDDEN_CARD_ID, name: "Secret" })).toBe(true);
    expect(isHiddenActivation({ cardId: 5, name: "" })).toBe(true);
    expect(isHiddenActivation({ cardId: 5 })).toBe(true);
    expect(activationBanner({ cardId: HIDDEN_CARD_ID, name: "Secret", player: 1 }, on)).toBeNull();
    expect(isHiddenActivation({ cardId: 5, name: "Raigeki" })).toBe(false);
  });
});

describe("activationTitle", () => {
  it("adds the chain link after the name", () => {
    expect(activationTitle({ name: "Mirror Force", chainLink: 2 })).toBe("Mirror Force · CL 2");
    expect(activationTitle({ name: "Mirror Force" })).toBe("Mirror Force");
  });
});

describe("pushActivationBanner", () => {
  it("keeps the newest first, at most three", () => {
    let list: number[] = [];
    for (const n of [1, 2, 3, 4]) list = pushActivationBanner(list, n);
    expect(list).toEqual([4, 3, 2]);
  });
});

describe("activationBannerMs", () => {
  it("is shorter at a faster game speed, never longer than at 1x", () => {
    expect(activationBannerMs(1)).toBe(ACTIVATION_BANNER_MS);
    expect(activationBannerMs(2)).toBe(ACTIVATION_BANNER_MS / 2);
    expect(activationBannerMs(0.5)).toBe(ACTIVATION_BANNER_MS);
    expect(activationBannerMs(undefined)).toBe(ACTIVATION_BANNER_MS);
  });
});

describe("activation banner text", () => {
  it("carries the card's effect text, whitespace collapsed", async () => {
    const { activationBanner } = await import("./activation-banner");
    const b = activationBanner({ cardId: 1, name: "Eclipse Twins", player: 1, desc: "Line one.\n\nLine  two." }, { isOpponent: true, enabled: true, recovering: false });
    expect(b?.text).toBe("Line one. Line two.");
    expect(activationBanner({ cardId: 1, name: "X", player: 1 }, { isOpponent: true, enabled: true, recovering: false })?.text).toBeUndefined();
  });
});
