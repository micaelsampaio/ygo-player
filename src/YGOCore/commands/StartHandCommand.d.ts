import { BaseCommand } from './BaseCommand';
import { StartHandCommandData } from '../types/commands';
export declare class StartHandCommand extends BaseCommand {
    baseType: string;
    private data;
    private cards;
    constructor(data: StartHandCommandData);
    exec(): void;
    undo(): void;
}
