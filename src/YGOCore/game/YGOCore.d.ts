import { Command } from "../types/commands";
import { PlayerField, YGOProps } from "../types/types";
import { EventBus } from "../utils/event-bus";
import { YGODuelLog } from "./YGODuelLog";
import { YGOGameState } from "./YGOGameState";
export declare class YGOCore {
    private commandId;
    props: YGOProps;
    state: YGOGameState;
    commands: Command[];
    commandIndex: number;
    duelLog: YGODuelLog;
    events: EventBus<any>;
    constructor(props: YGOProps);
    start(): void;
    exec(command: Command): Command;
    peek(): Command | null;
    redo(): Command | null;
    undo(): Command | null;
    goToCommand(command: Command): boolean;
    hasNextCommand(): boolean;
    hasPrevCommand(): boolean;
    getNextCommandId(): number;
    getReplayData(): import("../types/types").YGOReplayData;
    getField(player: number): PlayerField;
    private createYGOCommands;
}
