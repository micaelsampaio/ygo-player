import { BaseCommand } from './BaseCommand';
import { SendCardToGYCommandData } from '../types/commands';
import { YGOCore } from '../game/YGOCore';
export declare class SendCardToGYCommand extends BaseCommand {
    baseType: string;
    private data;
    private zone;
    private moveCardCommand;
    constructor(data: SendCardToGYCommandData);
    init(ygo: YGOCore): void;
    exec(): void;
    undo(): void;
}
