import { BaseCommand } from './BaseCommand';
import { XYZAttachCommandData as XYZAttachMaterialCommandData } from '../types/commands';
export declare class XYZAttachMaterialCommand extends BaseCommand {
    baseType: string;
    private data;
    private materialCardReference;
    private moveXYZMaterialsCommand;
    constructor(data: XYZAttachMaterialCommandData);
    exec(): void;
    undo(): void;
}
