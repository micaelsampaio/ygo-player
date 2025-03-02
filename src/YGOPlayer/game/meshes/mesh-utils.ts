import * as THREE from 'three';
import { YGODuel } from '../../core/YGODuel';
import { YGOTaskSequence } from '../../core/components/tasks/YGOTaskSequence';
import { ScaleTransition } from '../../duel-events/utils/scale-transition';
import { MultipleTasks } from '../../duel-events/utils/multiple-tasks';
import { MaterialOpacityTransition } from '../../duel-events/utils/material-opacity';
import { YGOTask } from '../../core/components/tasks/YGOTask';
import { WaitForSeconds } from '../../duel-events/utils/wait-for-seconds';

export function CardEmptyMesh({ material, card, color, depth = 0.02, transparent }: { material?: THREE.Material, color?: THREE.ColorRepresentation, depth?: number, card?: THREE.Object3D, transparent?: boolean } | undefined = {}) {
    const CARD_RATIO = 1.45;
    const height = 3.5, width = height / CARD_RATIO;
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const meshMaterial = material || new THREE.MeshBasicMaterial({ color, transparent });
    const mesh = new THREE.Mesh(geometry, meshMaterial);

    if (card) {
        mesh.position.copy(card.position);
        mesh.rotation.copy(card.rotation);
    }

    return mesh;
}

export function GameModalOverlayMesh() {
    const modalGeometry = new THREE.PlaneGeometry(1, 1);
    const modalMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.8,
    });

    const modalPlane = new THREE.Mesh(modalGeometry, modalMaterial);
    modalPlane.scale.set(20, 20, 20);
    modalPlane.position.set(0, 0, 14);

    return modalPlane;
}

export function CardActivationEffect({ duel, startTask, create = true, card }: { duel: YGODuel, create?: boolean, card: THREE.Object3D, startTask: any }) {

    const modalGeometry = new THREE.PlaneGeometry(1, 1);

    for (let i = 0; i < 2; ++i) {
        const frontTexture = duel.assets.getTexture(`${duel.config.cdnUrl}/images/particles/flame_02.png`);
        const material = new THREE.MeshBasicMaterial({ map: frontTexture, transparent: true, color: 0x0091ff }); // Front with texture
        const mesh = new THREE.Mesh(modalGeometry, material);
        const size = randomIntFromInterval(8, 9);
        material.opacity = 0;
        mesh.scale.set(size, size, size);
        mesh.rotation.copy(card.rotation);
        mesh.position.set(0, 0, -0.02);
        mesh.rotateZ(THREE.MathUtils.degToRad(i === 0 ? 45 : -90));
        mesh.scale.set(0, 0, 0);

        startTask(new YGOTaskSequence(
            new MultipleTasks(
                new MaterialOpacityTransition({
                    material: mesh.material,
                    opacity: 1,
                    duration: 0.3,
                }),
                new ScaleTransition({
                    gameObject: mesh,
                    scale: new THREE.Vector3(size * 0.8, size * 0.8, size * 0.8),
                    duration: 0.3
                }),
            ),
            new MultipleTasks(
                new MaterialOpacityTransition({
                    material: mesh.material,
                    opacity: 0,
                    duration: 0.25,
                }),
                new ScaleTransition({
                    gameObject: mesh,
                    scale: new THREE.Vector3(size * 1, size * 1, size * 1),
                    duration: 0.3
                }),
            )
        ));
        card.add(mesh);
    }
}

function randomIntFromInterval(min: number, max: number): number { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min);
}

export function createCardPopSummonEffectSequence({ duel, card, startTask, cardId }: any) {
    const CARD_RATIO = 1.45;
    const height = 3.5, width = height / CARD_RATIO;
    const cardTexture = duel.assets.getTexture(`${duel.config.cdnUrl}/images/cards_small/${cardId}.jpg`);
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
        map: cardTexture,
        transparent: true,
        opacity: 0.35,
    });

    const cardPlane = new THREE.Mesh(geometry, material);
    
    duel.core.sceneOverlay.add(cardPlane);

    cardPlane.position.copy(card.position);
    cardPlane.rotation.copy(card.rotation);
    cardPlane.scale.copy(card.scale);
    cardPlane.visible = true;

    const targetScale = cardPlane.scale.clone();
    targetScale.addScalar(2);

    cardPlane.position.z -= 0.1;

    startTask(new YGOTaskSequence(
        new ScaleTransition({
            gameObject: cardPlane,
            scale: targetScale,
            duration: 0.25
        })
    ));

    startTask(new YGOTaskSequence(
        new WaitForSeconds(0.1),
        new MaterialOpacityTransition({
            material: cardPlane.material,
            opacity: 0,
            duration: 0.15
        })
    ));
}