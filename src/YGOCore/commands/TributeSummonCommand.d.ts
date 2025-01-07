import { BaseCommand } from './BaseCommand';
import { TributeSummonCommandData } from '../types/commands';
export declare class TributeSummonCommand extends BaseCommand {
    private data;
    private commands;
    constructor(data: TributeSummonCommandData);
    exec(): void;
    undo(): void;
}
