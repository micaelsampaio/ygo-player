import { YGOCore } from "../game/YGOCore";
import { CommandType, Command } from "../types/commands";
export declare abstract class BaseCommand implements Command {
    protected YGO: YGOCore;
    type: CommandType;
    baseType: string;
    timestamp: number;
    commandId: number;
    parent: Command | null;
    constructor();
    init(ygo: YGOCore): void;
    getCommandId(): number;
    execChildCommand(command: Command): Command | undefined;
    undoChildCommand(command: Command | undefined): Command | undefined;
    undoMultipleChildCommand(commands: Command[]): void;
    execMultipleChildCommand(commands: Command[]): void;
    isValid(): boolean;
    exec(): void;
    undo(): void;
    toJSON<T extends any = any>(): {
        type: string;
        data: T;
    };
}
