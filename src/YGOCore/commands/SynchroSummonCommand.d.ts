import { BaseCommand } from './BaseCommand';
import { SynchroSummonCommandData } from '../types/commands';
export declare class SynchroSummonCommand extends BaseCommand {
    baseType: string;
    private data;
    private commands;
    constructor(data: SynchroSummonCommandData);
    exec(): void;
    undo(): void;
}
