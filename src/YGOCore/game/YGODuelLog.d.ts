import { Command } from "../types/commands";
import { EventBus } from "../utils/event-bus";
import { YGODuelEvents } from '../types/duel-events';
type YGODuelLogEventMap = {
    'new-log': (log: YGODuelEvents.DuelLog) => void;
    'update-logs': (logs: YGODuelEvents.DuelLog[]) => void;
};
export declare class YGODuelLog {
    logs: YGODuelEvents.DuelLog[];
    events: EventBus<YGODuelLogEventMap>;
    enabled: boolean;
    constructor();
    dispatch<T extends YGODuelEvents.DuelLog>(log: T): void;
    peek(): YGODuelEvents.DuelLog | null;
    peekCommand(): number;
    pop(): YGODuelEvents.DuelLog | null;
    removeCommand(command: Command, args?: {
        log: boolean;
    }): void;
    onLogsUpdated(): void;
}
export {};
