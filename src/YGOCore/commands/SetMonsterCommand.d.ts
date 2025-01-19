import { BaseCommand } from './BaseCommand';
import { SetMonsterCommandData } from '../types/commands';
export declare class SetMonsterCommand extends BaseCommand {
    baseType: string;
    private data;
    private moveCardCommand;
    constructor(data: SetMonsterCommandData);
    exec(): void;
    undo(): void;
}
