import { YGODuel } from "./YGODuel";
import * as THREE from "three";

export class YGODuelScene {

    constructor(private duel: YGODuel) {

    }


    public createFields({ gameField }: { gameField: THREE.Scene }) {
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // white light with intensity 1
        directionalLight.position.set(10, 10, 10); // You can adjust these values
        directionalLight.target.position.set(0, 0, 0); // points to the center of the scene
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;  // Higher value for better quality shadows
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;

        this.duel.core.scene.add(directionalLight);

        gameField.position.set(0, 0, 0);

        gameField.children.forEach((child: any) => {
            if (child.isMesh) {
                const material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(0xCCCCCC),
                    shadowSide: THREE.FrontSide,
                });

                child.material = material;
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        gameField.rotateX(THREE.MathUtils.degToRad(90));

        const clonedGameField = gameField.clone();
        clonedGameField.rotateY(THREE.MathUtils.degToRad(180));

        this.duel.core.scene.add(gameField);
        this.duel.core.scene.add(clonedGameField);
    }
}