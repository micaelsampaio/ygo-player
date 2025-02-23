import { GetCommandByClassName } from ".";
import { BaseCommand } from "./BaseCommand";

export class JSONCommand extends BaseCommand {
    constructor(cmd: { type: string, data: any }) {
        super();

        const CommandClass = GetCommandByClassName(cmd.type);

        if (!CommandClass) throw new Error(`Command "${cmd.type}" dont exists!`);

        const command = new (CommandClass as any)(cmd.data)

        return command;
    }
}