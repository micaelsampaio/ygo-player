import * as THREE from 'three';
import { YGODuel } from "../core/YGODuel";
import { YGOEntity } from "../core/YGOEntity";
import { YGOUiElement } from "../types";
import { YGOMouseEvents } from '../core/components/YGOMouseEvents';
import { CardEmptyMesh } from './meshes/mesh-utils';
import { CallbackTransition } from '../duel-events/utils/callback';
import { WaitForSeconds } from '../duel-events/utils/wait-for-seconds';
import { ScaleTransition } from '../duel-events/utils/scale-transition';
import { MaterialOpacityTransition } from '../duel-events/utils/material-opacity';
import { MultipleTasks } from '../duel-events/utils/multiple-tasks';
import { YGOTaskSequence } from '../core/components/tasks/YGOTaskSequence';
import { getCardRotation } from '../scripts/ygo-utils';

export class Banish extends YGOEntity implements YGOUiElement {

    public isUiElement: boolean = true;
    private duel: YGODuel;
    public player: number;
    private normalMaterial: THREE.MeshBasicMaterial;
    private hoverMaterial: THREE.MeshBasicMaterial;
    private mesh: THREE.Mesh;
    public position: THREE.Vector3;
    public rotation: THREE.Euler;
    public cardPosition: THREE.Vector3;
    //private action: ActionUiMenu;

    constructor({ duel, player, position }: { duel: YGODuel, player: number, zone: string, position: THREE.Vector3 }) {
        super();
        this.duel = duel;
        this.player = player;

        this.normalMaterial = new THREE.MeshBasicMaterial({ color: 0x00555, transparent: true, opacity: 0 });
        this.hoverMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });

        const geometry = new THREE.BoxGeometry(2.8, 2.8, 0.1);
        const cube = new THREE.Mesh(geometry, this.normalMaterial);
        cube.position.copy(position)

        this.cardPosition = position.clone();
        this.cardPosition.z += 0.8;

        this.duel.core.scene.add(cube);
        this.gameObject = cube;
        this.mesh = cube;

        this.position = this.gameObject.position.clone();
        this.rotation = this.gameObject.rotation.clone();
        this.position.z += 0.1;

        this.duel.gameController.getComponent<YGOMouseEvents>("mouse_events")?.registerElement(this);
    }

    onMouseClick(event: MouseEvent): void {
        this.duel.events.dispatch("toggle-ui-menu", { group: "game-overlay", type: "banish", data: { banish: this } })
    }

    onMouseEnter(): void {
        this.mesh.material = this.hoverMaterial;
    }

    onMouseLeave(): void {
        this.mesh.material = this.normalMaterial;
    }

    createBanishCardEffect({ card, sequence }: { card: THREE.Object3D, sequence: YGOTaskSequence }) {
        const cardEffect = CardEmptyMesh({
            transparent: true,
            color: 0xFFFFFF
        });
        card.add(cardEffect);
        cardEffect.position.set(0, 0, 0);
        cardEffect.rotation.set(0, 0, 0);
        cardEffect.scale.set(1.01, 1.01, 1.01);
        cardEffect.material.opacity = 0;

        sequence.addMultiple(
            new CallbackTransition(() => {
                card.visible = true;
                card.position.copy(this.cardPosition);
                card.scale.set(1, 1, 1);
            }),
            new WaitForSeconds(0.15),
            new MultipleTasks(
                new ScaleTransition({
                    gameObject: card,
                    scale: new THREE.Vector3(0.65, 0.65, 0.65),
                    duration: 0.2
                }),
                new MaterialOpacityTransition({
                    material: cardEffect.material,
                    opacity: 1,
                    duration: 0.2,
                })
            ),
            new ScaleTransition({
                gameObject: card,
                scale: new THREE.Vector3(0.2, 0.2, 0.2),
                duration: 0.15
            }),
            new CallbackTransition(() => {
                card.remove(cardEffect);
            })
        )
    }
    createMoveFromBanishCardEffect({ card, sequence }: { card: THREE.Object3D, sequence: YGOTaskSequence }) {
        const cardEffect = CardEmptyMesh({
            transparent: true,
            color: 0xFFFFFF
        });
        card.add(cardEffect);
        cardEffect.position.set(0, 0, 0);
        cardEffect.rotation.set(0, 0, 0);
        cardEffect.scale.set(1.01, 1.01, 1.01);
        cardEffect.material.opacity = 1;

        const rotation: THREE.Euler = new THREE.Euler(0, 0, THREE.MathUtils.degToRad(90) + (this.player === 0 ? 0 : 180));

        sequence.addMultiple(
            new CallbackTransition(() => {
                card.visible = true;
                card.scale.set(0, 0, 0);
                card.position.copy(this.cardPosition);
                card.rotation.copy(rotation);
            }),
            new ScaleTransition({
                gameObject: card,
                scale: new THREE.Vector3(1.35, 1.35, 1.35),
                duration: 0.25
            }),
            new MultipleTasks(
                new ScaleTransition({
                    gameObject: card,
                    scale: new THREE.Vector3(1, 1, 1),
                    duration: 0.2
                }),
                new MaterialOpacityTransition({
                    material: cardEffect.material,
                    opacity: 0,
                    duration: 0.2
                })
            ),
            new WaitForSeconds(0.15),
            new CallbackTransition(() => {
                card.remove(cardEffect);
            })
        )
    }
}