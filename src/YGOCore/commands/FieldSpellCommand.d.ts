import { BaseCommand } from './BaseCommand';
import { FieldSpellCommandData } from '../types/commands';
export declare class FieldSpellCommand extends BaseCommand {
    private data;
    private commands;
    constructor(data: FieldSpellCommandData);
    exec(): void;
    undo(): void;
}
