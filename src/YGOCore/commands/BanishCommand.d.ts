import { BaseCommand } from './BaseCommand';
import { BanishCommandData } from '../types/commands';
export declare class BanishCommand extends BaseCommand {
    baseType: string;
    private data;
    private zone;
    private banishCommand;
    constructor(data: BanishCommandData);
    exec(): void;
    undo(): void;
}
