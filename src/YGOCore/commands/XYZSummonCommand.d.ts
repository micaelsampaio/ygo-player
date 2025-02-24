import { BaseCommand } from './BaseCommand';
import { XYZSummonCommandData } from '../types/commands';
import { YGOCore } from '../game/YGOCore';
export declare class XYZSummonCommand extends BaseCommand {
    baseType: string;
    private data;
    private commands;
    private overlayZone;
    constructor(data: XYZSummonCommandData);
    init(ygo: YGOCore): void;
    exec(): void;
    undo(): void;
}
