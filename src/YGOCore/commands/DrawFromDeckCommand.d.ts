import { BaseCommand } from './BaseCommand';
import { DrawFromDeckCommandData } from '../types/commands';
export declare class DrawFromDeckCommand extends BaseCommand {
    baseType: string;
    private data;
    private cards;
    constructor(data: DrawFromDeckCommandData);
    exec(): void;
    undo(): void;
}
