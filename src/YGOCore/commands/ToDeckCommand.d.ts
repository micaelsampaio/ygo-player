import { BaseCommand } from './BaseCommand';
import { ToDeckCommandData } from '../types/commands';
import { YGOCore } from '../game/YGOCore';
export declare class ToDeckCommand extends BaseCommand {
    private data;
    private zone;
    private commands;
    constructor(data: ToDeckCommandData);
    private isTopCard;
    private getCommandType;
    private getDeckIndex;
    init(ygo: YGOCore): void;
    exec(): void;
    undo(): void;
}
