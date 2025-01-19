import { BaseCommand } from './BaseCommand';
import { SetCardCommandData } from '../types/commands';
export declare class ToSTCommand extends BaseCommand {
    baseType: string;
    private data;
    private moveCardCommand;
    constructor(data: SetCardCommandData);
    exec(): void;
    undo(): void;
}
