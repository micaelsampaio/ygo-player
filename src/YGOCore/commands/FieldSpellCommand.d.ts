import { BaseCommand } from './BaseCommand';
import { FieldSpellCommandData } from '../types/commands';
import { YGOCore } from '../game/YGOCore';
export declare class FieldSpellCommand extends BaseCommand {
    baseType: string;
    private data;
    private commands;
    constructor(data: FieldSpellCommandData);
    init(ygo: YGOCore): void;
    exec(): void;
    undo(): void;
}
