import { BaseCommand } from './BaseCommand';
import { FlipCommandData } from '../types/commands';
export declare class FlipCommand extends BaseCommand {
    baseType: string;
    private data;
    private prevPosition;
    constructor(data: FlipCommandData);
    exec(): void;
    undo(): void;
}
