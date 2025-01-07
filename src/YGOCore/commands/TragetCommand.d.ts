import { BaseCommand } from './BaseCommand';
import { TragetCommandData } from '../types/commands';
export declare class TargetCommand extends BaseCommand {
    private data;
    constructor(data: TragetCommandData);
    exec(): void;
}
