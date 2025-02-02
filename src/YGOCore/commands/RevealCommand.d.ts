import { BaseCommand } from './BaseCommand';
import { RevealCommandData } from '../types/commands';
export declare class RevealCommand extends BaseCommand {
    baseType: string;
    private data;
    constructor(data: RevealCommandData);
    exec(): void;
}
