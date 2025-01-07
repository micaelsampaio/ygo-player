import { YGODuelEvents } from "../../YGOCore";
import { YGODuel } from "../core/YGODuel";
import { normalSummonEventHandler } from "./normal-summon";

export interface DuelEventHandlerProps {
    duel: YGODuel,
    onCompleted: Function
}

const events: any = {
    [YGODuelEvents.LogType.NormalSummon]: normalSummonEventHandler
}

export function getDuelEventHandler(event: YGODuelEvents.DuelLog): any {
    const eventHandler = events[event.type]
    return eventHandler;
}