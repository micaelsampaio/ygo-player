import { BaseCommand } from './BaseCommand';
import { ChangeCardAtkDefCommandData } from '../types/commands';
export declare class ChangeCardAtkDefCommand extends BaseCommand {
    baseType: string;
    private data;
    private oldAtk;
    private oldDef;
    constructor(data: ChangeCardAtkDefCommandData);
    exec(): void;
    undo(): void;
}
