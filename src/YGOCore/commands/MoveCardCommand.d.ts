import { BaseCommand } from './BaseCommand';
import { MoveCardCommandData } from '../types/commands';
export declare class MoveCardCommand extends BaseCommand {
    baseType: string;
    data: MoveCardCommandData;
    private prevPosition;
    private commands;
    constructor(data: MoveCardCommandData);
    exec(): void;
    undo(): void;
    private shouldMoveMaterials;
}
