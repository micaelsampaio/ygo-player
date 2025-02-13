import { BaseCommand } from './BaseCommand';
import { TargetCommandData } from '../types/commands';
export declare class TargetCommand extends BaseCommand {
    baseType: string;
    private data;
    constructor(data: TargetCommandData);
    exec(): void;
}
