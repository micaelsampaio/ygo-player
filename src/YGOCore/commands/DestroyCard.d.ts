import { BaseCommand } from './BaseCommand';
import { DestroyCardCommandData } from '../types/commands';
export declare class DestroyCardCommand extends BaseCommand {
    baseType: string;
    private data;
    private zone;
    private moveCardCommand;
    constructor(data: DestroyCardCommandData);
    exec(): void;
    undo(): void;
}
