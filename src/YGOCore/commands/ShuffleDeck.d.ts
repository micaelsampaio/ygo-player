import { BaseCommand } from './BaseCommand';
import { ShuffleDeckCommandData } from '../types/commands';
export declare class ShuffleDeckCommand extends BaseCommand {
    private data;
    private cardPositions;
    constructor(data: ShuffleDeckCommandData);
    exec(): void;
    undo(): void;
}
