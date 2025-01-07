import { BaseCommand } from './BaseCommand';
import { NormalSummonCommandData } from '../types/commands';
export declare class RevealCommand extends BaseCommand {
    private data;
    constructor(data: NormalSummonCommandData);
    exec(): void;
}
