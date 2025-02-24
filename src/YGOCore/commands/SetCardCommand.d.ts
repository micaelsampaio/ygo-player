import { BaseCommand } from './BaseCommand';
import { SetCardCommandData } from '../types/commands';
import { YGOCore } from '../game/YGOCore';
export declare class SetCardCommand extends BaseCommand {
    baseType: string;
    private data;
    private prevPosition;
    private isMonster;
    private commands;
    constructor(data: SetCardCommandData);
    init(ygo: YGOCore): void;
    exec(): void;
    undo(): void;
}
