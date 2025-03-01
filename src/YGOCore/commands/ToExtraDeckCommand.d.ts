import { BaseCommand } from './BaseCommand';
import { ToExtraDeckCommandData } from '../types/commands';
import { YGOCore } from '../game/YGOCore';
export declare class ToExtraDeckCommand extends BaseCommand {
    baseType: string;
    private data;
    private moveCardCommand;
    constructor(data: ToExtraDeckCommandData);
    init(ygo: YGOCore): void;
    exec(): void;
    undo(): void;
}
