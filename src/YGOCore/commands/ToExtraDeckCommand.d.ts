import { BaseCommand } from './BaseCommand';
import { ToExtraDeckCommandData } from '../types/commands';
export declare class ToExtraDeckCommand extends BaseCommand {
    private data;
    private moveCardCommand;
    constructor(data: ToExtraDeckCommandData);
    exec(): void;
    undo(): void;
}
