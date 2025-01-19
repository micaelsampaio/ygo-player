import { BaseCommand } from './BaseCommand';
import { FieldSpellCommandData } from '../types/commands';
export declare class FieldSpellCommand extends BaseCommand {
    baseType: string;
    private data;
    private commands;
    constructor(data: FieldSpellCommandData);
    exec(): void;
    undo(): void;
}
