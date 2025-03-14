import { BaseCommand } from './BaseCommand';
import { MoveCardCommandData } from '../types/commands';
export declare class MoveCardCommand extends BaseCommand {
    baseType: string;
    data: MoveCardCommandData;
    private prevPosition;
    private prevOwner;
    private prevAtk;
    private prevDef;
    private commands;
    constructor(data: MoveCardCommandData);
    exec(): void;
    undo(): void;
    private shouldMoveMaterials;
}
