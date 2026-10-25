import { describe, expect, it } from "vitest";
import { promptOptionLabel, type LabelledPrompt } from "./assist-option-label";

const yubel = (n: number) => String((90829280n << 20n) | BigInt(n));
const nameOf = (code: number) => (code === 90829280 ? "Spirit of Yubel" : undefined);

describe("promptOptionLabel", () => {
  const base: LabelledPrompt = { player: 0, msg: 14, kind: "option", options: ["1153", yubel(4)] };

  it("shows the server's text for the option", () => {
    const prompt: LabelledPrompt = { ...base, optionLabels: ["Set", "Set it to your field"] };
    expect(promptOptionLabel(prompt, "1153", 0, nameOf)).toBe("Set");
    expect(promptOptionLabel(prompt, yubel(4), 1, nameOf)).toBe("Set it to your field");
  });

  it("falls back to Option N when the server sent no text (or null for that option)", () => {
    expect(promptOptionLabel(base, "1153", 0, nameOf)).toBe("Option 1");
    expect(promptOptionLabel(base, yubel(4), 1, nameOf)).toBe("Option 2 · Spirit of Yubel (effect 5)");
    expect(promptOptionLabel({ ...base, optionLabels: [null, "Set it to your field"] }, "1153", 0, nameOf)).toBe("Option 1");
  });
});
