import { describe, expect, it, vi } from "vitest";
import { YGOPlayerRemoteActions } from "ygo-core";
import { YGOServerActions } from "./YGOServerActions";

function setup() {
  const client: any = { send: vi.fn(), onMessage: () => {}, onDisconnect: () => {} };
  const dispatch = vi.fn();
  const duel: any = {
    ygo: { getField: (player: number) => ({ player: { name: player === 0 ? "Guest-9964" : "Bot" } }), options: {} },
    events: { dispatch },
  };
  return { actions: new YGOServerActions(duel, client), dispatch };
}

const chatLines = (dispatch: ReturnType<typeof vi.fn>) =>
  dispatch.mock.calls.filter(([event]) => event === "system-chat-message").map(([, data]) => data.message);

describe("YGOServerActions — a player's remote action", () => {
  it("Pass / OK posts no chat line", () => {
    const { actions, dispatch } = setup();
    for (let i = 0; i < 20; i++) actions.ygo.setPlayerRemoteAction({ player: 0, action: YGOPlayerRemoteActions.OK });
    expect(chatLines(dispatch)).toEqual([]);
  });

  it("Thinking, Wait and Keep going still do", () => {
    const { actions, dispatch } = setup();
    actions.ygo.setPlayerRemoteAction({ player: 1, action: YGOPlayerRemoteActions.Thinking });
    actions.ygo.setPlayerRemoteAction({ player: 0, action: YGOPlayerRemoteActions.WAIT });
    actions.ygo.setPlayerRemoteAction({ player: 0, action: YGOPlayerRemoteActions.ContinuousOK });
    expect(chatLines(dispatch)).toEqual(['Bot says "Thinking"', 'Guest-9964 says "Wait"', 'Guest-9964 says "Keep going"']);
  });
});
