import { BaseCommand } from './BaseCommand';
import { TributeSummonCommandData } from '../types/commands';
export declare class TributeSetCommand extends BaseCommand {
    private data;
    private commands;
    constructor(data: TributeSummonCommandData);
    exec(): void;
    undo(): void;
}
