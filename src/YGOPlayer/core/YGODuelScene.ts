import { YGOAnimationObject } from "../game/YGOAnimationObject";
import { PoolObjects } from "./PoolObjects";
import { YGODuel } from "./YGODuel";
import * as THREE from "three";

export class YGODuelScene {
    public selectedCardPlaceholder!: THREE.Object3D;
    public handPlaceholder!: THREE.Object3D;
    public gameFields: THREE.Scene[];

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

        this.gameFields.push(gameField);
        this.gameFields.push(clonedGameField);

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
            field.graveyard.hoverObject = this.duel.duelScene.gameFields[playerIndex].children.find(obj => obj.name === "GY_SELECTION_MESH");
            field.banishedZone.hoverObject = this.duel.duelScene.gameFields[playerIndex].children.find(obj => obj.name === "B_SELECTION_MESH");

            if (field.graveyard.hoverObject) {
                field.graveyard.hoverObject.visible = false;
            }
            if (field.banishedZone.hoverObject) {
                field.banishedZone.hoverObject.visible = false;
            }
        });


        this.createEffects();
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
        this.duel.assets.createPoool(destroyPool);
    }
}