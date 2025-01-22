import { YGOCore, YGODuelEvents } from "../../YGOCore";
import { YGOTask } from "../core/components/tasks/YGOTask";
import { YGODuel } from "../core/YGODuel";
import { LinkSummonEventHandler } from "./events/link-summon-event";
import { MoveCardEventHandler } from "./events/move-card-event";
import { SendToGyEventHandler } from "./events/send-to-gy-event";
import { UpdateFieldEvent } from "./events/update-field-event";

export interface DuelEventHandlerProps {
    duel: YGODuel,
    ygo: YGOCore,
    onCompleted: Function
    startTask: (task: YGOTask) => void
}

const events: any = {
    [YGODuelEvents.LogType.NormalSummon]: MoveCardEventHandler,
    [YGODuelEvents.LogType.SpecialSummon]: MoveCardEventHandler,
    [YGODuelEvents.LogType.SetMonster]: MoveCardEventHandler,
    [YGODuelEvents.LogType.SetST]: MoveCardEventHandler,
    [YGODuelEvents.LogType.SendToGY]: SendToGyEventHandler,
    [YGODuelEvents.LogType.Banish]: MoveCardEventHandler,
    [YGODuelEvents.LogType.BanishFD]: MoveCardEventHandler,
    [YGODuelEvents.LogType.FieldSpell]: MoveCardEventHandler,
    [YGODuelEvents.LogType.LinkSummon]: LinkSummonEventHandler,
    DEFAULT: UpdateFieldEvent
}

export function getDuelEventHandler(event: YGODuelEvents.DuelLog): any {
    const eventHandler = events[event.type] || events.DEFAULT;
    return eventHandler;
}

export function handleDuelEvent(duel: YGODuel, event: YGODuelEvents.DuelLog) {
    const taskManager = duel.tasks;
    const handler = getDuelEventHandler(event);

    if (!handler) {
        if (taskManager.isProcessing()) taskManager.complete();
        duel.updateField();
        return;
    }

    if (taskManager.isProcessing()) taskManager.complete();

    duel.events.publish("disable-game-actions");

    const onCompleted = () => {
        duel.updateField();
        duel.events.publish("enable-game-actions");
    }

    const props = {
        duel,
        ygo: duel.ygo,
        event,
        onCompleted
    };

    handler(props);
}