import { BaseCommand } from './BaseCommand';
import { ActivateCardCommandData } from '../types/commands';
export declare class ActivateCardCommand extends BaseCommand {
    private data;
    private prevPosition;
    constructor(data: ActivateCardCommandData);
    exec(): void;
    undo(): void;
}
