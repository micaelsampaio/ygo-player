import { BaseCommand } from './BaseCommand';
import { SetCardCommandData } from '../types/commands';
export declare class SetCardCommand extends BaseCommand {
    baseType: string;
    private data;
    private prevPosition;
    private commands;
    constructor(data: SetCardCommandData);
    exec(): void;
    undo(): void;
}
