import { BaseCommand } from './BaseCommand';
import { TributeSummonCommandData } from '../types/commands';
import { YGOCore } from '../game/YGOCore';
export declare class TributeSummonCommand extends BaseCommand {
    baseType: string;
    private data;
    private tributes;
    private commands;
    constructor(data: TributeSummonCommandData);
    init(ygo: YGOCore): void;
    exec(): void;
    undo(): void;
}
