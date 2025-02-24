import { BaseCommand } from './BaseCommand';
import { MillFromDeckCommandData } from '../types/commands';
import { YGOCore } from '../game/YGOCore';
export declare class MillFromDeckCommand extends BaseCommand {
    baseType: string;
    private data;
    private commands;
    constructor(data: MillFromDeckCommandData);
    init(ygo: YGOCore): void;
    exec(): void;
    undo(): void;
}
