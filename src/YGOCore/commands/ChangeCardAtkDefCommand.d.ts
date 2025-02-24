import { BaseCommand } from './BaseCommand';
import { ChangeCardAtkDefCommandData } from '../types/commands';
export declare class ChangeCardAtkDefCommand extends BaseCommand {
    private data;
    private prevAtk;
    private prevDef;
    constructor(data: ChangeCardAtkDefCommandData);
    exec(): void;
    undo(): void;
}
