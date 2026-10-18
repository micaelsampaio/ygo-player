import type { YGOCore, YGODuelEvents } from "ygo-core";
import type { YGOTask } from "../core/components/tasks/YGOTask";
import type { YGOCommandHandler } from "../core/components/YGOCommandHandler";
import type { YGODuel } from "../core/YGODuel";

/**
 * What every duel-event handler gets from the commands controller. Kept in
 * this leaf module (types only) so the handlers don't import the registry in
 * index.ts, which imports them.
 */
export interface DuelEventHandlerProps {
  duel: YGODuel;
  ygo: InstanceType<typeof YGOCore>;
  onCompleted: () => void;
  playSound: (options: {
    key: string;
    layer?: string;
    volume?: number;
    loop?: boolean;
    onComplete?: () => void;
  }) => void;
  startTask: (task: YGOTask) => void;
}

/** A handler class as the commands controller builds it: with the log routed to it by its type. */
export type DuelEventHandlerClass = new (
  props: DuelEventHandlerProps & { event: YGODuelEvents.DuelLog },
) => YGOCommandHandler;
