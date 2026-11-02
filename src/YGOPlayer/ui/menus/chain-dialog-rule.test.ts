import { describe, expect, it } from "vitest";
import { chainDialogFor } from "./chain-dialog-rule";

const chain = (respond: Record<string, unknown>) => ({ available: true, pending: "chain", respond });

describe("chainDialogFor", () => {
  it("is the dialog for a response, in every duel", () => {
    for (const botDuel of [true, false]) {
      expect(chainDialogFor(chain({ chainLength: 1 }), { botDuel, isLocalTurn: false })).toEqual({ dialog: true, open: false });
      expect(chainDialogFor(chain({ chainLength: 0, responding: true }), { botDuel, isLocalTurn: true })).toEqual({ dialog: true, open: false });
      expect(chainDialogFor(chain({ forced: true }), { botDuel, isLocalTurn: true })).toEqual({ dialog: true, open: false });
    }
  });

  it("is the dialog for an open window only in the bot's turn (it's paused, waiting on you)", () => {
    expect(chainDialogFor(chain({ chainLength: 0 }), { botDuel: true, isLocalTurn: false })).toEqual({ dialog: true, open: true });
    // Your own turn, and PvP / solo: the panel, as before.
    expect(chainDialogFor(chain({ chainLength: 0 }), { botDuel: true, isLocalTurn: true })).toEqual({ dialog: false, open: false });
    expect(chainDialogFor(chain({ chainLength: 0 }), { botDuel: false, isLocalTurn: false })).toEqual({ dialog: false, open: false });
  });

  it("is never the dialog outside a chain window", () => {
    expect(chainDialogFor({ available: true, pending: "idle" }, { botDuel: true, isLocalTurn: false }).dialog).toBe(false);
    expect(chainDialogFor({ available: false, pending: "chain" }, { botDuel: true, isLocalTurn: false }).dialog).toBe(false);
  });
});
