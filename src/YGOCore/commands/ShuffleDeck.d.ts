import { BaseCommand } from './BaseCommand';
import { ShuffleDeckCommandData } from '../types/commands';
export declare class ShuffleDeckCommand extends BaseCommand {
    baseType: string;
    private data;
    private cardPositions;
    constructor(data: ShuffleDeckCommandData);
    exec(): void;
    undo(): void;
}
