import * as THREE from 'three';
import { YGODuel } from "../core/YGODuel";
import { YGOEntity } from "../core/YGOEntity";
import { YGOUiElement } from "../types";
import { YGOMouseEvents } from '../core/components/YGOMouseEvents';

export class Graveyard extends YGOEntity implements YGOUiElement {

    public isUiElement: boolean = true;
    private duel: YGODuel;
    private normalMaterial: THREE.MeshBasicMaterial;
    private hoverMaterial: THREE.MeshBasicMaterial;
    private mesh: THREE.Mesh;
    //private action: ActionUiMenu;

    constructor({ duel, player, position }: { duel: YGODuel, player: number, zone: string, position: THREE.Vector3 }) {
        super();
        this.duel = duel;
        //this.action = new ActionUiMenu(duel, { eventType: "graveyard-menu" });

        this.normalMaterial = new THREE.MeshBasicMaterial({ color: 0x00555 });
        this.hoverMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });

        const geometry = new THREE.BoxGeometry(2, 0.1, 2);
        const cube = new THREE.Mesh(geometry, this.normalMaterial);
        cube.position.set(8, 1, 3);

        this.duel.core.scene.add(cube);
        this.gameObject = cube;
        this.mesh = cube;

        this.duel.gameController.getComponent<YGOMouseEvents>("mouse_events")?.registerElement(this);
    }

    onMouseClick(event: MouseEvent): void {
        console.log("CLICK GY");
        //this.action.eventData = { duel: this.duel, mouseEvent: event };

        this.duel.events.publish("toggle-ui-menu", { key: "game-overlay", type: "gy" })
        //this.duel.actionManager.setAction(this.action);
    }

    onMouseEnter(): void {
        this.mesh.material = this.hoverMaterial;
    }

    onMouseLeave(): void {
        this.mesh.material = this.normalMaterial;
    }
}