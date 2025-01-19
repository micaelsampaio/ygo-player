import { BaseCommand } from './BaseCommand';
import { SpecialSummonCommandData } from '../types/commands';
export declare class SpecialSummonCommand extends BaseCommand {
    baseType: string;
    private data;
    private moveCardCommand;
    constructor(data: SpecialSummonCommandData);
    exec(): void;
    undo(): void;
}
