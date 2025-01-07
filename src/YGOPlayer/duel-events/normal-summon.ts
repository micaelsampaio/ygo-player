import { DuelEventHandlerProps } from ".";
import { YGODuelEvents } from "../../YGOCore";

interface NormalSummonProps extends DuelEventHandlerProps {
    event: YGODuelEvents.NormalSummon,
}

export function* normalSummonEventHandler({ duel, event, onCompleted }: NormalSummonProps) {

    yield null;

    const dt = duel.deltaTime;

    for (let i = 0; i < 1; ++i) {
        console.log(i, " dt: ", dt);
    }
    // TODO RES

    onCompleted();
}