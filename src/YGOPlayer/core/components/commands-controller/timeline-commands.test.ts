import { describe, expect, it, vi } from "vitest";
import { YGOCommandScope } from "ygo-core";
import type { Command } from "ygo-core";
import type { YGODuel } from "../../YGODuel";
import { ControllerCommandTag } from "./commands";
import { Exec } from "./exec";
import { ExecCommandHandler } from "./exec-command-handler";
import { Goto } from "./goto";
import { Play } from "./play";
import { Redo } from "./redo";
import { Undo } from "./undo";
import { YGOCommandsControllerState } from "./state";
import { YGOCommandHandler } from "../YGOCommandHandler";

/** A duel whose timeline calls are recorded, in order, into `log`. */
function fakeDuel({ recovering = false, peekId = 1 }: { recovering?: boolean; peekId?: number } = {}) {
  const log: string[] = [];
  let isRecovering = recovering;
  const duel = {
    commands: {
      isRecovering: () => isRecovering,
      startRecover: vi.fn(() => { isRecovering = true; log.push("startRecover"); }),
      endRecover: vi.fn(() => { isRecovering = false; log.push("endRecover"); }),
      setState: vi.fn((state: YGOCommandsControllerState) => log.push(`state:${state}`)),
      clearRequestedPause: vi.fn(() => log.push("clearRequestedPause")),
    },
    ygo: {
      goToCommand: vi.fn((id: number) => log.push(`goTo:${id}`)),
      undo: vi.fn(() => log.push("undo")),
      redo: vi.fn(() => log.push("redo")),
      exec: vi.fn(() => log.push("exec")),
      peek: () => ({ commandId: peekId }),
    },
    updateField: vi.fn(() => log.push("updateField")),
    clearActions: vi.fn(() => log.push("clearActions")),
  };
  return { duel: duel as unknown as YGODuel, log };
}

describe("controller timeline commands", () => {
  describe("Goto", () => {
    it("jumps inside a recover, goes idle and redraws the field", () => {
      const { duel, log } = fakeDuel();
      new Goto(duel, 7).exec();
      expect(log).toEqual(["startRecover", "goTo:7", "endRecover", `state:${YGOCommandsControllerState.IDLE}`, "updateField", "clearActions"]);
    });

    it("only moves the core while the controller is already recovering", () => {
      const { duel, log } = fakeDuel({ recovering: true });
      new Goto(duel, 3).exec();
      expect(log).toEqual(["goTo:3"]);
    });
  });

  describe("Undo", () => {
    it("runs immediately (never queued)", () => {
      const { duel } = fakeDuel();
      expect(new Undo(duel, 1).hasTag(ControllerCommandTag.EXEC_IMMEDIATLY)).toBe(true);
    });

    it("goes to the command, undoes it and redraws, all inside a recover", () => {
      const { duel, log } = fakeDuel();
      new Undo(duel, 4).exec();
      expect(log).toEqual(["startRecover", "goTo:4", "undo", "endRecover", "updateField", "clearActions"]);
    });

    it("only undoes while recovering", () => {
      const { duel, log } = fakeDuel({ recovering: true });
      new Undo(duel, 4).exec();
      expect(log).toEqual(["undo"]);
    });
  });

  describe("Redo", () => {
    it("redoes from the current command without a jump", () => {
      const { duel, log } = fakeDuel({ peekId: 5 });
      new Redo(duel, 5).exec();
      expect(log).toEqual(["updateField", `state:${YGOCommandsControllerState.PLAYING_COMMAND}`, "redo"]);
    });

    it("jumps to the command first when the core is elsewhere", () => {
      const { duel, log } = fakeDuel({ peekId: 2 });
      new Redo(duel, 5).exec();
      expect(log).toEqual(["startRecover", "goTo:5", "endRecover", "updateField", `state:${YGOCommandsControllerState.PLAYING_COMMAND}`, "redo"]);
    });

    it("jumps and redoes without touching the state while recovering", () => {
      const { duel, log } = fakeDuel({ recovering: true });
      new Redo(duel, 5).exec();
      expect(log).toEqual(["goTo:5", "redo"]);
    });
  });

  describe("Play", () => {
    it("clears a requested pause and starts playing from the command", () => {
      const { duel, log } = fakeDuel({ peekId: 2 });
      new Play(duel, 6).exec();
      expect(log).toEqual(["clearRequestedPause", "startRecover", "goTo:6", "endRecover", "updateField", `state:${YGOCommandsControllerState.PLAYING}`, "redo"]);
    });

    it("does nothing but clear the pause while recovering", () => {
      const { duel, log } = fakeDuel({ recovering: true });
      new Play(duel, 6).exec();
      expect(log).toEqual(["clearRequestedPause"]);
    });
  });

  describe("Exec", () => {
    const command = (scope: YGOCommandScope) => ({ scope }) as unknown as Command;

    it("plays a game command as PLAYING and a non-game one as PLAYING_COMMAND", () => {
      const game = fakeDuel();
      new Exec(game.duel, command(YGOCommandScope.GAME)).exec();
      expect(game.log).toEqual([`state:${YGOCommandsControllerState.PLAYING}`, "exec"]);

      const other = fakeDuel();
      new Exec(other.duel, command(YGOCommandScope.SYSTEM)).exec();
      expect(other.log).toEqual([`state:${YGOCommandsControllerState.PLAYING_COMMAND}`, "exec"]);
    });

    it("runs immediately and without a state change when created during a recover", () => {
      const { duel, log } = fakeDuel({ recovering: true });
      const exec = new Exec(duel, command(YGOCommandScope.GAME));
      expect(exec.hasTag(ControllerCommandTag.EXEC_IMMEDIATLY)).toBe(true);
      exec.exec();
      expect(log).toEqual(["exec"]);
    });
  });

  describe("ExecCommandHandler", () => {
    class Handler extends YGOCommandHandler {
      constructor() { super("handler"); }
      start = vi.fn();
      finish = vi.fn();
    }

    it("is a game event handler that starts its handler", () => {
      const { duel } = fakeDuel();
      const handler = new Handler();
      const cmd = new ExecCommandHandler(duel, handler);
      expect(cmd.hasTag(ControllerCommandTag.GAME_EVENT_HANDLER)).toBe(true);
      cmd.exec();
      expect(handler.start).toHaveBeenCalledTimes(1);
      cmd.finish();
      expect(handler.finish).toHaveBeenCalledTimes(1);
    });

    it("drops its handler while recovering (no animation, nothing to finish)", () => {
      const { duel } = fakeDuel({ recovering: true });
      const handler = new Handler();
      const cmd = new ExecCommandHandler(duel, handler);
      cmd.exec();
      cmd.finish();
      expect(handler.start).not.toHaveBeenCalled();
      expect(handler.finish).not.toHaveBeenCalled();
    });
  });
});
