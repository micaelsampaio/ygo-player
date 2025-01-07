import { YGOEntity } from "./YGOEntity";

export abstract class YGOComponent {
    public name: string;
    public enabled: boolean;

    constructor(name: string) {
        this.name = name;
        this.enabled = true;
    }

    public start() {

    }

    public onDestroy():void {

    }
    
    public update(dt: number = 0) {

    }

    public setEnabled(status: boolean) {
        this.enabled = status;
    }
}