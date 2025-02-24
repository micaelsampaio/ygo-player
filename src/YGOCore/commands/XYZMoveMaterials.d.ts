import { BaseCommand } from './BaseCommand';
import { XYZMoveMaterialsCommandData } from '../types/commands';
import { YGOCore } from '../game/YGOCore';
export declare class XYZMoveMaterialsCommand extends BaseCommand {
    baseType: string;
    private data;
    private commands;
    private materialsToMove;
    constructor(data: XYZMoveMaterialsCommandData);
    init(ygo: YGOCore): void;
    exec(): void;
    undo(): void;
    private shouldMoveMaterials;
}
