import { BaseCommand } from './BaseCommand';
import { FusionSummonCommandData } from '../types/commands';
import { YGOCore } from '../game/YGOCore';
export declare class FusionSummonCommand extends BaseCommand {
    baseType: string;
    private data;
    private materialsCommands;
    private commands;
    private materials;
    constructor(data: FusionSummonCommandData);
    init(ygo: YGOCore): void;
    exec(): void;
    undo(): void;
}
