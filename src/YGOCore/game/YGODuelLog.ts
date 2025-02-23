import { Command } from "../types/commands";
import { EventBus } from "../utils/event-bus";
import { YGODuelEvents } from '../types/duel-events';

type YGODuelLogEventMap = {
    'new-log': (log: YGODuelEvents.DuelLog) => void;
    'update-logs': (logs: YGODuelEvents.DuelLog[]) => void;
};

export class YGODuelLog {
    public logs: YGODuelEvents.DuelLog[];
    public events: EventBus<YGODuelLogEventMap>;
    public enabled: boolean = true;

    constructor() {
        this.logs = [];
        this.events = new EventBus();
    }

    dispatch<T extends YGODuelEvents.DuelLog>(log: T) {
        if(!this.enabled) return;
        
        this.logs.push(log);
        this.events.dispatch("new-log", log);
        this.onLogsUpdated();
    }

    peek(): YGODuelEvents.DuelLog | null {
        if (this.logs.length == 0) return null;
        return this.logs[this.logs.length - 1];
    }

    peekCommand(): number {
        if (this.logs.length == 0) return -1;
        return this.logs[this.logs.length - 1].commandId;
    }

    pop(): YGODuelEvents.DuelLog | null {
        if (this.logs.length === 0) return null;
        return this.logs.pop() as YGODuelEvents.DuelLog;
    }

    removeCommand(command: Command, args?: { log: boolean }) {
        const commandIndex = this.logs.findIndex(cmd => cmd.commandId === command.commandId);

        if (commandIndex !== -1) {
            this.logs.splice(commandIndex, this.logs.length - commandIndex);
        }

        if (args?.log !== false) {
            this.events.dispatch("update-logs", this.logs);
        }
    }

    onLogsUpdated() {
        this.events.dispatch("update-logs", this.logs);
    }
}