import * as THREE from 'three';
import { YGODuel } from "../core/YGODuel";
import { YGOEntity } from "../core/YGOEntity";
import { YGOUiElement } from "../types";
import { YGOMouseEvents } from '../core/components/YGOMouseEvents';

export class Graveyard extends YGOEntity implements YGOUiElement {

    public isUiElement: boolean = true;
    private duel: YGODuel;
    public player: number;
    private normalMaterial: THREE.MeshBasicMaterial;
    private hoverMaterial: THREE.MeshBasicMaterial;
    private mesh: THREE.Mesh;
    public position: THREE.Vector3;
    public rotation: THREE.Euler;

    constructor({ duel, player, position }: { duel: YGODuel, player: number, zone: string, position: THREE.Vector3 }) {
        super();
        this.duel = duel;
        this.player = player;

        this.normalMaterial = new THREE.MeshBasicMaterial({ color: 0x00555 });
        this.hoverMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });

        const geometry = new THREE.BoxGeometry(3, 3, 0.1);
        const cube = new THREE.Mesh(geometry, this.normalMaterial);
        cube.position.copy(position)

        this.duel.core.scene.add(cube);
        this.gameObject = cube;
        this.mesh = cube;


        if (player === 1) {
            this.gameObject.rotateZ(THREE.MathUtils.degToRad(180));
        }

        this.position = this.gameObject.position.clone();
        this.position.z += 0.1;
        this.rotation = this.gameObject.rotation.clone();

        this.duel.gameController.getComponent<YGOMouseEvents>("mouse_events")?.registerElement(this);
    }

    onMouseClick(event: MouseEvent): void {
        this.duel.events.dispatch("toggle-ui-menu", { group: "game-overlay", type: "gy", data: { graveyard: this } })
    }

    onMouseEnter(): void {
        this.mesh.material = this.hoverMaterial;
    }

    onMouseLeave(): void {
        this.mesh.material = this.normalMaterial;
    }
}