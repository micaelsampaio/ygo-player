import { describe, expect, it, vi } from "vitest";
import { YGODuelEvents } from "ygo-core";
import type { YGOTask } from "../../core/components/tasks/YGOTask";
import { DuelLifePointsEventHandler } from "./duel-lifepoints-event";

type Props = ConstructorParameters<typeof DuelLifePointsEventHandler>[0];

function setup(event: Partial<YGODuelEvents.LifePoints>, { zeroLpPrompt = false, gameMode = "LOCAL" } = {}) {
  const tasks: YGOTask[] = [];
  const props = {
    duel: {
      config: { gameMode, options: { zeroLpPrompt } },
      events: { dispatch: vi.fn() },
      createCdnUrl: (s: string) => s,
    },
    ygo: {},
    event: { type: YGODuelEvents.LogType.LifePoints, player: 1, commandId: 1, previousLifePoints: 8000, lifePoints: 6500, ...event },
    onCompleted: vi.fn(),
    playSound: vi.fn(),
    startTask: (task: YGOTask) => {
      task.start();
      tasks.push(task);
    },
  } as unknown as Props; // a stub duel with only what the handler reads
  const tick = (dt: number) => tasks.forEach((t) => !t.isCompleted() && t.update(dt));
  return { props, dispatch: props.duel.events.dispatch as ReturnType<typeof vi.fn>, tasks, tick };
}

describe("DuelLifePointsEventHandler", () => {
  it("updates the life points, plays the sound and completes after its 0.4s beat", () => {
    const s = setup({});
    new DuelLifePointsEventHandler(s.props).start();

    expect(s.dispatch).toHaveBeenCalledWith("duel-update-player-life-points", s.props.event);
    s.tick(0.05);
    expect(s.props.playSound).toHaveBeenCalledWith({ key: "/sounds/life_points.ogg", volume: 0.8 });
    s.tick(0.2);
    expect(s.props.onCompleted).not.toHaveBeenCalled();
    for (let i = 0; i < 10; i++) s.tick(0.1);

    expect(s.tasks.every((t) => t.isCompleted())).toBe(true);
    expect(s.props.onCompleted).toHaveBeenCalledTimes(1);
  });

  it("stays silent when the life points did not change", () => {
    const s = setup({ previousLifePoints: 4000, lifePoints: 4000 });
    new DuelLifePointsEventHandler(s.props).start();
    for (let i = 0; i < 10; i++) s.tick(0.1);

    expect(s.props.playSound).not.toHaveBeenCalled();
    expect(s.props.onCompleted).toHaveBeenCalledTimes(1);
  });

  it("opens the zero-LP prompt only when enabled, outside replays, as the LP reach 0", () => {
    const prompt = (s: ReturnType<typeof setup>) => s.dispatch.mock.calls.some((c) => c[0] === "set-ui-menu");

    const hit = setup({ lifePoints: 0 }, { zeroLpPrompt: true });
    new DuelLifePointsEventHandler(hit.props).start();
    expect(hit.dispatch).toHaveBeenCalledWith("set-ui-menu", { group: "game-overlay", type: "zero-lp-prompt", data: { player: 1 } });

    for (const s of [
      setup({ lifePoints: 0 }),
      setup({ lifePoints: 0 }, { zeroLpPrompt: true, gameMode: "REPLAY" }),
      setup({ previousLifePoints: 0, lifePoints: 0 }, { zeroLpPrompt: true }),
      setup({ lifePoints: 100 }, { zeroLpPrompt: true }),
    ]) {
      new DuelLifePointsEventHandler(s.props).start();
      expect(prompt(s)).toBe(false);
    }
  });
});
