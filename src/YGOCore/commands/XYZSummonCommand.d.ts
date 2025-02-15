import { BaseCommand } from './BaseCommand';
import { XYZSummonCommandData } from '../types/commands';
export declare class XYZSummonCommand extends BaseCommand {
    baseType: string;
    private data;
    private commands;
    private overlayZone;
    constructor(data: XYZSummonCommandData);
    exec(): void;
    undo(): void;
}
