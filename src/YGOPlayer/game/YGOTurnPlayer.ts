import * as THREE from 'three';
import { YGODuel } from "../core/YGODuel";
import { YGOEntity } from '../core/YGOEntity';
import { YGOMouseEvents } from '../core/components/YGOMouseEvents';
import { YGOUiElement } from '../types';
import { YGOStatic } from '../core/YGOStatic';

export class YGOTurnPlayer extends YGOEntity implements YGOUiElement {
    public isUiElement: boolean = true;
    private textures: THREE.Texture[];
    private fieldTurnHover: THREE.Mesh;
    private fieldTurnHoverMaterial: THREE.MeshBasicMaterial;
    private turnMaterial: THREE.MeshBasicMaterial;

    constructor(private duel: YGODuel) {
        super();

        const fieldObjects = this.duel.assets.models.get(this.duel.createCdnUrl("/models/field_objects.glb"))!.scene.clone()!;
        const fieldTurn = fieldObjects.children.find(children => children.name === "player_turn")!;
        const fieldTurnPlaceHolder = fieldObjects.children.find(children => children.name === "player_turn_placeholder")!.clone()! as THREE.Mesh;
        this.fieldTurnHover = fieldObjects.children.find(children => children.name === "player_turn_hover")!.clone() as THREE.Mesh;

        fieldTurn.add(fieldTurnPlaceHolder);
        fieldTurn.rotation.set(THREE.MathUtils.degToRad(90), 0, 0);
        this.fieldTurnHover.rotation.set(THREE.MathUtils.degToRad(90), 0, 0);

        this.textures = [
            this.duel.assets.getTexture(this.duel.createCdnUrl("/images/ui/turn_player_1.png")),
            this.duel.assets.getTexture(this.duel.createCdnUrl("/images/ui/turn_player_2.png")),
        ]

        if (YGOStatic.isPlayerPOV(1)) {
            this.textures.reverse();
        }

        this.turnMaterial = new THREE.MeshBasicMaterial({ map: this.textures[0] });
        fieldTurnPlaceHolder.material = this.turnMaterial;

        const normalMaterial = new THREE.MeshBasicMaterial({ color: 0x00555, transparent: true, opacity: 0 });
        const geometry = new THREE.BoxGeometry(3, 3, 0.1);
        const clickElement = new THREE.Mesh(geometry, normalMaterial);
        clickElement.position.set(11, 0, 0.5);

        clickElement.add(fieldTurn);
        clickElement.add(this.fieldTurnHover);

        fieldTurn.position.set(0, 0, -0.5);
        fieldTurnPlaceHolder.position.set(0, -0.1, 0);
        fieldTurnPlaceHolder.rotation.set(0, 0, 0);

        this.gameObject = clickElement;

        this.fieldTurnHoverMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.5 });
        this.fieldTurnHover.material = this.fieldTurnHoverMaterial;
        this.fieldTurnHover.visible = false;
        this.fieldTurnHover.position.set(0, 0, -0.5);

        this.duel.gameController.getComponent<YGOMouseEvents>("mouse_events")?.registerElement(this);
        this.duel.core.scene.add(this.gameObject);

        this.gameObject.scale.set(0.7, 0.7, 0.7);
        this.duel.ygo.events.on("set-duel-turn-priority", ({ turnPriority }) => {
            this.setActivePlayer(turnPriority)
        });
        this.duel.ygo.events.on("set-duel-turn", ({ turnPriority }) => {
            this.setActivePlayer(turnPriority)
        });
    }

    setActivePlayer(turnPriority: number): void {
        this.turnMaterial.map = this.textures[turnPriority] || this.textures[0];
        this.turnMaterial.needsUpdate = true;
        this.fieldTurnHoverMaterial.color.setHex(YGOStatic.isPlayerPOV(turnPriority) ? 0x0000ff : 0xff0000);
    }

    onMouseClick(): void {
        this.duel.setActivePlayer(this.duel.getActivePlayer() === 0 ? 1 : 0);
    }

    onMouseEnter(): void {
        this.fieldTurnHover.visible = true;
    }

    onMouseLeave(): void {
        this.fieldTurnHover.visible = false;
    }
}