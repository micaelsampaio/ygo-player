import * as THREE from 'three';
import { YGODuel } from "../core/YGODuel";
import { YGOEntity } from '../core/YGOEntity';
import { YGOMouseEvents } from '../core/components/YGOMouseEvents';
import { YGOUiElement } from '../types';

export class YGOTurnPlayer extends YGOEntity implements YGOUiElement {
    public isUiElement: boolean = true;
    private textures: THREE.Texture[];

    constructor(private duel: YGODuel) {
        super();

        const fieldObjects = this.duel.assets.models.get(this.duel.createCdnUrl("/models/field_objects.glb"))
        const fieldTurn = fieldObjects?.scene.children.find(children => children.name === "player_turn")!;
        const fieldTurnPlaceHolder = fieldObjects?.scene.children.find(children => children.name === "player_turn_placeholder")!.clone()! as THREE.Mesh;

        fieldTurn.add(fieldTurnPlaceHolder);
        fieldTurn.rotation.set(THREE.MathUtils.degToRad(90), 0, 0);

        fieldTurnPlaceHolder.position.set(0, 0.01, 0);
        fieldTurnPlaceHolder.rotation.set(0, 0, 0);

        this.textures = [
            this.duel.assets.getTexture(this.duel.createCdnUrl("/images/ui/turn_player_1.png")),
            this.duel.assets.getTexture(this.duel.createCdnUrl("/images/ui/turn_player_2.png")),
        ]

        const turnMaterial = new THREE.MeshBasicMaterial({ map: this.textures[0] });
        fieldTurnPlaceHolder.material = turnMaterial;

        const normalMaterial = new THREE.MeshBasicMaterial({ color: 0x00555, transparent: true, opacity: 0 });
        const geometry = new THREE.BoxGeometry(3, 3, 0.1);
        const clickElement = new THREE.Mesh(geometry, normalMaterial);
        clickElement.position.set(10, 0, 1);

        clickElement.add(fieldTurn);
        fieldTurn.position.set(0, 0, -0.1);

        this.gameObject = clickElement;

        this.duel.gameController.getComponent<YGOMouseEvents>("mouse_events")?.registerElement(this);
        this.duel.core.scene.add(this.gameObject);

        this.duel.ygo.events.on("set-player", ({ player }) => {
            turnMaterial.map = this.textures[player] || this.textures[0];
            turnMaterial.needsUpdate = true;
        });
    }

    onMouseClick(): void {
        this.duel.setActivePlayer(this.duel.getActivePlayer() === 0 ? 1 : 0);
    }
}