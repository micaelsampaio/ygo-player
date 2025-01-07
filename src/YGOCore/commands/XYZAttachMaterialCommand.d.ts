import { BaseCommand } from './BaseCommand';
import { XYZAttachCommandData as XYZAttachMaterialCommandData } from '../types/commands';
export declare class XYZAttachMaterialCommand extends BaseCommand {
    private data;
    private materialCardReference;
    constructor(data: XYZAttachMaterialCommandData);
    exec(): void;
    undo(): void;
}
