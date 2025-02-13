import { BaseCommand } from './BaseCommand';
import { LinkSummonCommandData } from '../types/commands';
import { YGOCore } from '../game/YGOCore';
export declare class LinkSummonCommand extends BaseCommand {
    baseType: string;
    private data;
    private commands;
    private position;
    constructor(data: LinkSummonCommandData);
    init(ygo: YGOCore): void;
    exec(): void;
    undo(): void;
}
