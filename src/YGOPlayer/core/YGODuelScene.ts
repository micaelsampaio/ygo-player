import { YGOAnimationObject } from "../game/YGOAnimationObject";
import { YGOGameFieldObject } from "../game/YGOGameFieldObject";
import { YGOTurnPlayer } from "../game/YGOTurnPlayer";
import { PoolObjects } from "./PoolObjects";
import { YGODuel } from "./YGODuel";
import * as THREE from "three";
import { YGOEntity } from "./YGOEntity";
import { YGOUiElement } from "../types";
import { YGOMouseEvents } from "./components/YGOMouseEvents";
import { ActionUiMenu } from "../actions/ActionUiMenu";


export class YGODuelScene {
    public selectedCardPlaceholder!: THREE.Object3D;
    public handPlaceholder!: THREE.Object3D;
    public gameFields: YGOGameFieldObject[];
    public turnPlayer!: YGOTurnPlayer;

    constructor(private duel: YGODuel) {
        this.gameFields = [];
    }

    public createGameMusic() {
        const sound = this.duel.soundController.playSound({
            key: this.duel.createCdnUrl("/music/temp.mp3"),
            layer: "GAME_MUSIC",
            volume: 0.2,
            loop: true
        });

        const audio = sound.element;

        const isPlaying = () => !audio.paused && !audio.ended && audio.readyState > 2;

        if (!isPlaying()) {
            const resumeAudio = () => {
                audio.play().catch((e) => console.warn("Audio play failed:", e));
                window.removeEventListener("click", resumeAudio, true);
            };

            window.addEventListener("click", resumeAudio, true);
        }
    }

    public createFields({ gameField }: { gameField: THREE.Scene }) {

        const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
        directionalLight.position.set(20, 40, 25);
        directionalLight.target.position.set(0, 0, 0);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 100;
        directionalLight.shadow.camera.left = -15;
        directionalLight.shadow.camera.right = 15;
        directionalLight.shadow.camera.top = 15;
        directionalLight.shadow.camera.bottom = -15;
        directionalLight.shadow.bias = -0.0005;
        directionalLight.shadow.normalBias = 0.04;

        this.duel.core.scene.add(new THREE.AmbientLight('white', 1));
        this.duel.core.scene.add(directionalLight);
        this.duel.core.scene.add(directionalLight.target);

        gameField.position.set(0, 0, 0);

        gameField.rotateX(THREE.MathUtils.degToRad(90));

        const clonedGameField = gameField.clone();
        clonedGameField.rotateY(THREE.MathUtils.degToRad(180));

        this.duel.core.scene.add(gameField);
        this.duel.core.scene.add(clonedGameField);

        this.gameFields.push(new YGOGameFieldObject(this.duel, gameField, 0));
        this.gameFields.push(new YGOGameFieldObject(this.duel, clonedGameField, 1));

        const selectedCardGeometry = new THREE.PlaneGeometry(7, 15);
        const selectedCardMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0, wireframe: false });
        this.selectedCardPlaceholder = new THREE.Mesh(selectedCardGeometry, selectedCardMaterial);
        this.selectedCardPlaceholder.position.set(-16.5, 0, 0.1);
        this.duel.core.scene.add(this.selectedCardPlaceholder);

        const handObjectGeometry = new THREE.PlaneGeometry(22, 4);
        const handObjectMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0, wireframe: false });
        const handObject = new THREE.Mesh(handObjectGeometry, handObjectMaterial);
        this.duel.core.scene.add(handObject);
        this.handPlaceholder = handObject;

        this.duel.fields.forEach((field, playerIndex) => {
            field.graveyard.hoverObject = this.duel.duelScene.gameFields[playerIndex].gameObject.children.find(obj => obj.name === "GY_SELECTION_MESH");
            field.banishedZone.hoverObject = this.duel.duelScene.gameFields[playerIndex].gameObject.children.find(obj => obj.name === "B_SELECTION_MESH");

            if (field.graveyard.hoverObject) {
                field.graveyard.hoverObject.visible = false;
            }
            if (field.banishedZone.hoverObject) {
                field.banishedZone.hoverObject.visible = false;
            }
        });

        this.turnPlayer = new YGOTurnPlayer(this.duel);

        this.createEffects();
        this.createFieldButtons();
    }

    private createEffects() {
        const destroyModel = this.duel.assets.models.get(`${this.duel.config.cdnUrl}/models/destroy_effect.glb`)!;
        const destroyPool = new PoolObjects({
            name: "destroyEffect",
            amount: 1,
            create: () => {
                const gameObject = destroyModel.scene.clone();
                const animations = destroyModel.animations;
                const clone = new YGOAnimationObject({
                    gameObject,
                    animations
                });
                clone.playAll();
                this.duel.add(clone);
                return clone;
            }
        });
        this.duel.assets.createPool(destroyPool);
    }

    private createFieldButtons() {

        const globalMenuAction = new ActionUiMenu(this.duel, {
            eventType: "global-events-menu",
            eventData: { duel: this.duel }
        });

        const btn = new YGOFieldButton(this.duel, new THREE.Vector3(-10, 0, -0.3), () => {
            globalMenuAction.eventData.transform = btn.gameObject;
            this.duel.actionManager.setAction(globalMenuAction);
        });
    }
}

class YGOFieldButton extends YGOEntity implements YGOUiElement {

    private hoverElement!: THREE.Mesh;

    constructor(private duel: YGODuel, private position: THREE.Vector3, private onClick: () => void) {
        super();

        const fieldObjects = this.duel.assets.models.get(this.duel.createCdnUrl("/models/field_objects.glb"));
        const buttonsRef = fieldObjects?.scene.children.find(child => child.name === "field_button")!;

        const hiddenClickMaterial = new THREE.MeshBasicMaterial({ color: 0x00555, transparent: true, opacity: 0 });
        const geometry = new THREE.BoxGeometry(1.65, 1.65, 0.1);
        const clickElement = new THREE.Mesh(geometry, hiddenClickMaterial);
        clickElement.position.copy(this.position);

        const btn = buttonsRef.clone();
        btn.rotation.set(THREE.MathUtils.degToRad(90), 0, 0);
        btn.position.set(0, 0, 0);

        const hoverMaterial = new THREE.MeshBasicMaterial({ color: 0x0055ff });
        this.hoverElement = btn.children.find(child => child.name === "hover_effect")! as THREE.Mesh;
        this.hoverElement.visible = false;
        this.hoverElement.material = hoverMaterial;

        clickElement.add(btn);

        this.gameObject = clickElement;
        this.duel.gameController.getComponent<YGOMouseEvents>("mouse_events")?.registerElement(this);

        this.duel.core.scene.add(this.gameObject);
    }

    onMouseClick(): void {
        this.onClick();
    }

    onMouseEnter(): void {
        this.hoverElement.visible = true;
    }

    onMouseLeave(): void {
        this.hoverElement.visible = false;
    }
}