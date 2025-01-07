import { BaseCommand } from './BaseCommand';
import { XYZDetachCommandData } from '../types/commands';
export declare class XYZDetachMaterialCommand extends BaseCommand {
    private data;
    private materialCardReference;
    constructor(data: XYZDetachCommandData);
    exec(): void;
    undo(): void;
}
