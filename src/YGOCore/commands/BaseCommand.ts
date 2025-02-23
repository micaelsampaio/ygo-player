import { YGOCore } from "../game/YGOCore";
import { CommandType, Command } from "../types/commands";

export abstract class BaseCommand implements Command {

    protected YGO!: YGOCore;
    public type!: CommandType;
    public baseType!: string;
    public commandId: number = -1;
    public parent: Command | null = null;

    constructor() { }

    init(ygo: YGOCore) {
        this.YGO = ygo;
        this.commandId = this.YGO.getNextCommandId();
    }

    getCommandId() {
        return this.parent?.commandId || this.commandId;
    }

    execChildCommand(command: Command): Command | undefined {
        command.parent = this.parent ? this.parent : this;
        command.init(this.YGO);
        command.exec();
        return command;
    }

    undoChildCommand(command: Command | undefined): Command | undefined {
        command?.undo();
        return command;
    }

    undoMultipleChildCommand(commands: Command[]): void {
        for (let i = commands.length - 1; i >= 0; --i) {
            commands[i]?.undo();
        }
    }

    execMultipleChildCommand(commands: Command[]): void {
        for (const command of commands) {
            this.execChildCommand(command);
        }
    }

    isValid(): boolean {
        return true;
    }

    exec(): void {

    }

    undo(): void {

    }

    toJSON<T extends any = any>(): { type: string, data: T } {
        const self = this as any;
        const data = self.data || {};

        return {
            type: this.baseType,
            data,
        };
    }
}