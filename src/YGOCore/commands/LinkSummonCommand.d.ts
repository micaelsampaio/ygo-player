import { BaseCommand } from './BaseCommand';
import { LinkSummonCommandData } from '../types/commands';
export declare class LinkSummonCommand extends BaseCommand {
    baseType: string;
    private data;
    private commands;
    private position;
    constructor(data: LinkSummonCommandData);
    exec(): void;
    undo(): void;
}
