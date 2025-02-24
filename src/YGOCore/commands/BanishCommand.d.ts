import { BaseCommand } from './BaseCommand';
import { BanishCommandData } from '../types/commands';
import { YGOCore } from '../game/YGOCore';
export declare class BanishCommand extends BaseCommand {
    baseType: string;
    private data;
    private zone;
    private banishCommand;
    constructor(data: BanishCommandData);
    init(ygo: YGOCore): void;
    exec(): void;
    undo(): void;
}
