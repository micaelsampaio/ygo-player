import { BaseCommand } from './BaseCommand';
import { ChangeCardPositionCommandData } from '../types/commands';
export declare class ChangeCardPositionCommand extends BaseCommand {
    private data;
    private prevPosition;
    constructor(data: ChangeCardPositionCommandData);
    exec(): void;
    undo(): void;
}
