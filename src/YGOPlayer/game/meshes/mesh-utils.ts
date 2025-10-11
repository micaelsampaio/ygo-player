import * as THREE from 'three';
import { YGODuel } from '../../core/YGODuel';
import { YGOTaskSequence } from '../../core/components/tasks/YGOTaskSequence';
import { ScaleTransition } from '../../duel-events/utils/scale-transition';
import { MultipleTasks } from '../../duel-events/utils/multiple-tasks';
import { MaterialOpacityTransition } from '../../duel-events/utils/material-opacity';
import { WaitForSeconds } from '../../duel-events/utils/wait-for-seconds';
import { CARD_DEPTH, CARD_HEIGHT_SIZE, CARD_RATIO } from '../../constants';
import { Card } from 'ygo-core';
import { CallbackTransition } from '../../duel-events/utils/callback';
import { CardMaterialGrayscale } from '../materials/game-card-material';
import { isCardTransformFlipDown } from '../../scripts/ygo-utils';

export function CardEmptyMesh({ material, card, color, depth = CARD_DEPTH, transparent }: { material?: THREE.Material, color?: THREE.ColorRepresentation, depth?: number, card?: THREE.Object3D, transparent?: boolean } | undefined = {}) {
    const height = CARD_HEIGHT_SIZE, width = height / CARD_RATIO;
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
    modalPlane.scale.set(50, 50, 50);
    modalPlane.position.set(0, 0, 14);

    return modalPlane;
}

export function CardActivationEffect({ duel, delay = 0, card, startTask, playSound }: { duel: YGODuel, delay?: number, card: THREE.Object3D, startTask: any, playSound: any }) {

    const modalGeometry = new THREE.PlaneGeometry(1, 1);
    const isFlipedDown = isCardTransformFlipDown(card);

    for (let i = 0; i < 2; ++i) {
        const frontTexture = duel.assets.getTexture(`${duel.config.cdnUrl}/images/particles/flame_02.png`);
        const material = new THREE.MeshBasicMaterial({ map: frontTexture, side: THREE.DoubleSide, transparent: true, color: 0x0091ff }); // Front with texture
        const mesh = new THREE.Mesh(modalGeometry, material);
        const size = randomIntFromInterval(8, 9);
        material.opacity = 0;
        mesh.scale.set(size, size, size);
        mesh.rotation.copy(card.rotation);
        mesh.position.set(0, 0, isFlipedDown ? 0.02 : -0.02);
        mesh.rotateZ(THREE.MathUtils.degToRad(i === 0 ? 45 : -90));
        mesh.scale.set(0, 0, 0);

        startTask(new YGOTaskSequence(
            new WaitForSeconds(delay),
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
                new CallbackTransition(() => {
                    playSound({ key: duel.createCdnUrl(`/sounds/card_activation.ogg`), volume: 0.5 });
                })
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

export function CardNegationEffect({ duel, card, startTask }: { duel: YGODuel, card: THREE.Object3D, startTask: any }) {

    const modalGeometry = new THREE.PlaneGeometry(1, 1);
    const delay = 0.2;
    const isFlipDown = isCardTransformFlipDown(card);
    for (let i = 0; i < 3; ++i) {
        const frontTexture = duel.assets.getTexture(`${duel.config.cdnUrl}/images/particles/spark_0${i + 1}.png`);
        const material = new THREE.MeshBasicMaterial({ map: frontTexture, transparent: true, color: 0x007ac1, opacity: 1 }); // Front with texture
        const mesh = new THREE.Mesh(modalGeometry, material);
        const size = 6;
        mesh.scale.set(size, size, size);
        mesh.rotation.copy(card.rotation);
        mesh.position.set(0, 0, isFlipDown ? -0.03 : 0.03);
        mesh.rotateZ(THREE.MathUtils.degToRad(randomIntFromInterval(0, 360)));
        mesh.visible = false;

        startTask(new YGOTaskSequence(
            new WaitForSeconds(0.1 + delay + (i * 0.2)),
            new CallbackTransition(() => {
                mesh.visible = true;
            }),
            new WaitForSeconds(0.05),
            new CallbackTransition(() => {
                mesh.visible = false;
            })
        ));
        card.add(mesh);
    }
}

function randomIntFromInterval(min: number, max: number): number { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min);
}

export function createCardPopSummonEffectSequence({ duel, card, startTask, cardData }: { duel: YGODuel, card: THREE.Object3D, startTask: any, cardData: Card }) {
    const height = CARD_HEIGHT_SIZE, width = height / CARD_RATIO;

    if (!cardData) return;

    const cardTexture = duel.assets.getTexture(cardData.images.small_url);
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

export function createSquareWithTopMiddlePivot(width: number, height: number, material: THREE.Material) {
    const geometry = new THREE.PlaneGeometry(width, height);
    geometry.translate(0, -height / 2, 0);
    const mesh = new THREE.Mesh(geometry, material);

    return mesh;
}

export class GameCardGrayscale {
    public gameObject: THREE.Mesh;

    constructor({ duel, card }: { duel: YGODuel, card: Card }) {
        const height = CARD_HEIGHT_SIZE, width = height / CARD_RATIO, depth = CARD_DEPTH;
        const geometry = new THREE.BoxGeometry(width, height, depth);

        const frontTexture = duel.assets.getTexture(card.images.small_url);
        const backTexture = duel.assets.getTexture(`${duel.config.cdnUrl}/images/card_back.png`);
        const frontMaterial = new CardMaterialGrayscale({ map: frontTexture }); // Front with texture
        const backMaterial = new THREE.MeshBasicMaterial({ map: backTexture }); // Back
        const depthMaterial = new THREE.MeshBasicMaterial({ color: 0xb5b5b5 }); // Depth


        const materials = [
            depthMaterial, // Right (depth)
            depthMaterial, // Left (depth)
            depthMaterial, // Top (depth)
            depthMaterial, // Bottom (depth)
            frontMaterial, // Front
            backMaterial, // Back
        ];

        this.gameObject = new THREE.Mesh(geometry, materials);
    }
}