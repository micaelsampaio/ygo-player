import { describe, expect, it } from "vitest";
import { YGODuelEvents } from "ygo-core";
import { getDuelEventHandler } from ".";
import { ActivateCardHandler } from "./events/activate-card-event";
import { AttackEventHandler } from "./events/attack-event";
import { ChangeCardPositionHandler } from "./events/change-card-position";
import { MoveCardEventHandler } from "./events/move-card-event";
import { SendToGyEventHandler } from "./events/send-to-gy-event";
import { TributeSummonEventHandler } from "./events/tribute-summon-event";
import { UpdateFieldEvent } from "./events/update-field-event";
import { XYZSummonEventHandler } from "./events/xyz-summon-event";

const handlerFor = (type: string) => getDuelEventHandler({ type, player: 0, commandId: 1 } as YGODuelEvents.DuelLog);

describe("getDuelEventHandler", () => {
  it.each([
    [YGODuelEvents.LogType.NormalSummon, MoveCardEventHandler],
    [YGODuelEvents.LogType.Banish, MoveCardEventHandler],
    [YGODuelEvents.LogType.DrawCardFromDeck, MoveCardEventHandler],
    [YGODuelEvents.LogType.SendToGY, SendToGyEventHandler],
    [YGODuelEvents.LogType.Tribute, SendToGyEventHandler],
    [YGODuelEvents.LogType.SetST, ChangeCardPositionHandler],
    [YGODuelEvents.LogType.Flip, ChangeCardPositionHandler],
    [YGODuelEvents.LogType.TributeSet, TributeSummonEventHandler],
    [YGODuelEvents.LogType.XYZOverlaySummon, XYZSummonEventHandler],
    [YGODuelEvents.LogType.Attack, AttackEventHandler],
    [YGODuelEvents.LogType.AttackDirectly, AttackEventHandler],
    [YGODuelEvents.LogType.Activate, ActivateCardHandler],
  ])("routes %s to its handler", (type, Handler) => {
    expect(handlerFor(type)).toBe(Handler);
  });

  it.each([
    YGODuelEvents.LogType.DuelPhase,
    YGODuelEvents.LogType.ChainResolved,
    "__unknown__",
  ])("falls back to a field update for %s", (type) => {
    expect(handlerFor(type)).toBe(UpdateFieldEvent);
  });
});
