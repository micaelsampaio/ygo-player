import { BaseCommand } from './BaseCommand';
import { FusionSummonCommandData } from '../types/commands';
export declare class FusionSummonCommand extends BaseCommand {
    private data;
    private commands;
    constructor(data: FusionSummonCommandData);
    exec(): void;
    undo(): void;
}
