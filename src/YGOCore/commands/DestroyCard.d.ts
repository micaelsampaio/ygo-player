import { BaseCommand } from './BaseCommand';
import { DestroyCardCommandData } from '../types/commands';
export declare class DestroyCardCommand extends BaseCommand {
    private data;
    private zone;
    private moveCardCommand;
    constructor(data: DestroyCardCommandData);
    exec(): void;
    undo(): void;
}
