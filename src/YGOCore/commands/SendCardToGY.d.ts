import { BaseCommand } from './BaseCommand';
import { SendCardToGYCommandData } from '../types/commands';
export declare class SendCardToGYCommand extends BaseCommand {
    private data;
    private zone;
    private moveCardCommand;
    constructor(data: SendCardToGYCommandData);
    exec(): void;
    undo(): void;
}
