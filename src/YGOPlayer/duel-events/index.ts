import { YGOCore, YGODuelEvents } from "../../YGOCore";
import { YGODuel } from "../core/YGODuel";
import { MoveCardEventHandler } from "./events/move-card-event";

export interface DuelEventHandlerProps {
    duel: YGODuel,
    ygo: YGOCore,
    onCompleted: Function
}

const events: any = {
    [YGODuelEvents.LogType.NormalSummon]: MoveCardEventHandler,
    [YGODuelEvents.LogType.SpecialSummon]: MoveCardEventHandler,
    [YGODuelEvents.LogType.SetMonster]: MoveCardEventHandler,
    [YGODuelEvents.LogType.SetST]: MoveCardEventHandler,
    [YGODuelEvents.LogType.SendToGY]: MoveCardEventHandler,
    //[YGODuelEvents.LogType.DrawCardFromDeck]: MoveCardEventHandler,
}

export function getDuelEventHandler(event: YGODuelEvents.DuelLog): any {
    const eventHandler = events[event.type];
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