import { BaseCommand } from './BaseCommand';
import { NormalSummonCommandData } from '../types/commands';
export declare class NormalSummonCommand extends BaseCommand {
    baseType: string;
    private data;
    private moveCardCommand;
    constructor(data: NormalSummonCommandData);
    exec(): void;
    undo(): void;
}
