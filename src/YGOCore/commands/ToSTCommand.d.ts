import { BaseCommand } from './BaseCommand';
import { ToSTCommandData } from '../types/commands';
export declare class ToSTCommand extends BaseCommand {
    baseType: string;
    private data;
    private moveCardCommand;
    constructor(data: ToSTCommandData);
    exec(): void;
    undo(): void;
}
