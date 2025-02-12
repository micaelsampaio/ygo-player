import * as THREE from 'three';
import { YGODuel } from "../core/YGODuel";
import { YGOEntity } from "../core/YGOEntity";
import { YGOUiElement } from "../types";
import { YGOMouseEvents } from '../core/components/YGOMouseEvents';
import { GameBackCard } from './GameBackCard';

export class ExtraDeck extends YGOEntity implements YGOUiElement {

    public isUiElement: boolean = true;
    private duel: YGODuel;
    private player: number;
    private normalMaterial: THREE.MeshBasicMaterial;
    private hoverMaterial: THREE.MeshBasicMaterial;
    private mesh: THREE.Mesh;
    public position: THREE.Vector3;
    public faceDownRotation: THREE.Euler;
    //private action: ActionUiMenu;

    private cards: GameBackCard[];

    constructor({ duel, player, position }: { duel: YGODuel, player: number, zone: string, position: THREE.Vector3 }) {
        super();
        this.duel = duel;
        this.player = player;

        this.normalMaterial = new THREE.MeshBasicMaterial({ color: 0x00555, transparent: true, opacity: 0 });
        this.hoverMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });

        const geometry = new THREE.BoxGeometry(2, 2, 0.1);
        const cube = new THREE.Mesh(geometry, this.normalMaterial);

        this.position = position.clone();
        cube.position.copy(this.position);

        this.faceDownRotation = cube.rotation.clone();
        this.faceDownRotation.y += THREE.MathUtils.degToRad(180);

        this.duel.core.scene.add(cube);
        this.gameObject = cube;
        this.mesh = cube;

        this.duel.gameController.getComponent<YGOMouseEvents>("mouse_events")?.registerElement(this);

        this.cards = Array.from(new Array(60)).map((_, index) => {
            const card = new GameBackCard({ duel: this.duel });
            card.gameObject.position.set(cube.position.x, cube.position.y, cube.position.z + index * 0.02);
            card.gameObject.rotation.set(0, THREE.MathUtils.degToRad(180), THREE.MathUtils.degToRad(15));
            if (player === 1) {
                card.gameObject.rotateZ(THREE.MathUtils.degToRad(180));
            }
            return card;
        });
    }

    getCardTransform(): THREE.Object3D {
        for (let i = this.cards.length - 1; i >= 0; --i) {
            if (this.cards[i].gameObject.visible) {
                return this.cards[i].gameObject;
            }
        }

        return this.gameObject;
    }

    updateExtraDeck() {
        const deckSize = this.duel.ygo.getField(this.player).extraDeck.length;
        for (let i = 0; i < this.cards.length; ++i) {
            this.cards[i].gameObject.visible = i <= deckSize;
        }
    }

    onMouseClick(event: MouseEvent): void {
        this.duel.events.publish("toggle-ui-menu", { group: "game-overlay", type: "extra-deck", data: { player: this.player, extraDeck: this } })
    }

    onMouseEnter(): void {
        this.mesh.material = this.hoverMaterial;
    }

    onMouseLeave(): void {
        this.mesh.material = this.normalMaterial;
    }
}