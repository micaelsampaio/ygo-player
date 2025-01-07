import * as THREE from 'three';
import { YGOEntity } from "../core/YGOEntity";
import { YGODuel } from '../core/YGODuel';
import { Card } from '../../YGOCore/types/types';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { YGOMath } from '../core/YGOMath';

export class GameCard extends YGOEntity {
    private duel: YGODuel;
    public zone: string = ""
    public cardReference!: Card;

    private atkDefStatsText: THREE.Mesh | undefined;
    private atkDefStatsTextGeometry: TextGeometry | undefined;

    constructor({ duel, card }: { duel: YGODuel, card?: Card }) {
        super();

        this.duel = duel;

        const CARD_RATIO = 1.45;
        const width = 2, height = width * CARD_RATIO, depth = 0.02;
        const geometry = new THREE.BoxGeometry(width, height, depth);

        const frontMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff }); // Depth
        const backMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Depth
        const depthMaterial = new THREE.MeshBasicMaterial({ color: 0xb5b5b5 }); // Depth

        const materials = [
            depthMaterial, // Right (depth)
            depthMaterial, // Left (depth)
            depthMaterial, // Top (depth)
            depthMaterial,  // Bottom (depth)
            frontMaterial, // Front
            backMaterial,  // Back
        ];
        this.gameObject = new THREE.Mesh(geometry, materials);
        this.duel.core.scene.add(this.gameObject);
        if (card) this.setCard(card);
    }

    setCard(card: Card) {
        // TODO
        this.cardReference = card;

        const textureLoader = this.duel.core.textureLoader;
        const frontTexture = textureLoader.load(`http://127.0.0.1:8080/images/cards_small/${card.id}.jpg`);
        const backTexture = textureLoader.load('http://127.0.0.1:8080/images/card_back.png');
        const frontMaterial = new THREE.MeshBasicMaterial({ map: frontTexture }); // Front with texture
        const backMaterial = new THREE.MeshBasicMaterial({ map: backTexture });  // Back
        const depthMaterial = new THREE.MeshBasicMaterial({ color: 0xb5b5b5 }); // Depth

        const materials = [
            depthMaterial, // Right (depth)
            depthMaterial, // Left (depth)
            depthMaterial, // Top (depth)
            depthMaterial,  // Bottom (depth)
            frontMaterial, // Front
            backMaterial,  // Back
        ];

        const mesh = this.gameObject as THREE.Mesh;
        mesh.material = materials;

        this.gameObject.name = card.name;

        this.createAtkDef();

        // if (card.position === "faceup-defense") {
        //     this.gameObject.rotateZ(YGOMath.degToRad(270));
        // } else if (card.position === "facedown") {
        //     if (this.zone.startsWith("M")) {
        //         this.gameObject.rotateY(YGOMath.degToRad(180));
        //         this.gameObject.rotateZ(YGOMath.degToRad(270));
        //     } else {
        //         this.gameObject.rotateY(YGOMath.degToRad(180));
        //     }
        // }
    }

    private createAtkDef() {
        // TODO MAKE A FUNCION isMonster();
        if (!this.cardReference.type.includes("Monster")) return;
        // TODO MAKE A FUNCTION isFaceDown();
        if (this.cardReference.position === "facedown") return;

        this.destroyAtkDefStats();

        // move this to a component
        this.duel.core.fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {

            let atkDef = "";

            if (this.cardReference.type === "Link Monster") {
                atkDef = `${this.cardReference.atk}`;
            } else {
                atkDef = `${this.cardReference.atk}/${this.cardReference.def}`;
            }

            const textGeometry = new TextGeometry(atkDef, {
                font: font,
                size: 0.3,
                height: 0.05,
            });

            textGeometry.computeBoundingBox();
            const boundingBox = textGeometry.boundingBox!;

            const centerOffset = new THREE.Vector3();
            boundingBox.getCenter(centerOffset);

            textGeometry.translate(-centerOffset.x, -centerOffset.y, -centerOffset.z);

            const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);

            textMesh.position.set(0, -1.5, 0.2);

            //this.duel.core.scene.add(textMesh);
            this.atkDefStatsTextGeometry = textGeometry;
            this.atkDefStatsText = textMesh;

            this.gameObject.add(textMesh);
        });
    }

    public hideAtkDefStat() {
        if (this.atkDefStatsText) this.atkDefStatsText.visible = false;
    }

    public showAtkDefStat() {
        if (this.atkDefStatsText) this.atkDefStatsText.visible = true;
    }

    private destroyAtkDefStats() {
        if (this.atkDefStatsText) {
            this.atkDefStatsTextGeometry?.dispose();
            this.duel.core.scene.remove(this.atkDefStatsText);
            this.atkDefStatsText = undefined;
            this.atkDefStatsTextGeometry = undefined;
        }
    }

    destroy() {
        // destroy attack def stats

        this.destroyAtkDefStats();
        this.duel.destroy(this);
    }
}