import { BaseCommand } from './BaseCommand';
import { ToHandCommandData } from '../types/commands';
import { YGOCore } from '../game/YGOCore';
export declare class ToHandCommand extends BaseCommand {
    baseType: string;
    private data;
    private command;
    constructor(data: ToHandCommandData);
    init(ygo: YGOCore): void;
    exec(): void;
    undo(): void;
}
