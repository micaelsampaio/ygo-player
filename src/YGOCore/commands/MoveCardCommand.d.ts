import { BaseCommand } from './BaseCommand';
import { MoveCardCommandData } from '../types/commands';
export declare class MoveCardCommand extends BaseCommand {
    data: MoveCardCommandData;
    private prevPosition;
    private materialsToGY;
    constructor(data: MoveCardCommandData);
    exec(): void;
    undo(): void;
    private sendMaterialsToGy;
}
