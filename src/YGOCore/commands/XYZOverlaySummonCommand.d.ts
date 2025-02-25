import { BaseCommand } from './BaseCommand';
import { XYZSummonCommandData } from '../types/commands';
import { YGOCore } from '../game/YGOCore';
export declare class XYZOverlaySummonCommand extends BaseCommand {
    baseType: string;
    private data;
    private commands;
    private overlayZone;
    private previousMaterialsData;
    private cardMaterials;
    constructor(data: XYZSummonCommandData);
    init(ygo: YGOCore): void;
    exec(): void;
    undo(): void;
}
