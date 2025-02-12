import { TextGeometry } from "three/examples/jsm/Addons.js";
import * as THREE from 'three';
import { YGODuel } from "../core/YGODuel";
import { Card } from "../../YGOCore/types/types";
import { YGOGameUtils } from "../../YGOCore";
import { YGOMath } from "../core/YGOMath";

export class GameCardStats {
    public parent: THREE.Object3D;
    public duel: YGODuel;
    public card: Card;

    // text meshes
    private atkDefTextGeometry: TextGeometry | undefined;
    private atkDefTextMesh: THREE.Mesh | undefined;

    private levelTextGeometry: TextGeometry | undefined;
    private levelTextMesh: THREE.Mesh | undefined;

    private materialsTextGeometry: TextGeometry | undefined;
    private materialsTextMesh: THREE.Mesh | undefined;

    // cached data to update
    private atk: number = -9;
    private def: number = -9;
    private level: number = -9;
    private materials: number = -9;

    private gameGroup: THREE.Group;

    constructor({ parent, card, duel }: { parent: THREE.Object3D, card: Card, duel: YGODuel }) {
        this.parent = parent;
        this.card = card;
        this.duel = duel;
        this.gameGroup = new THREE.Group();
        this.parent.add(this.gameGroup);
    }

    show() {
        this.gameGroup.visible = true;
    }

    hide() {
        this.gameGroup.visible = false;
    }

    destroy() {
        this.destroyAtkDef();
        this.destroyLevel();
    }

    render() {
        this.updateAtkDef();
        this.updateLevel();
        this.updateMaterials();

        if (YGOGameUtils.isAttack(this.card)) {
            this.gameGroup.position.set(0, -1.5, 0.2);
        } else {
            this.gameGroup.rotation.set(0, 0, YGOMath.degToRad(-90));
            let localPosition = this.parent.worldToLocal(this.parent.position.clone());
            localPosition.x -= 1.5;
            this.gameGroup.position.copy(localPosition);
        }
    }

    private destroyAtkDef() {
        if (this.atkDefTextGeometry) {
            this.atkDefTextGeometry.dispose();
        }
        if (this.atkDefTextMesh) {
            this.gameGroup.remove(this.atkDefTextMesh);
        }
        this.atkDefTextGeometry = undefined;
        this.atkDefTextMesh = undefined;
    }

    private destroyLevel() {
        if (this.levelTextGeometry) {
            this.levelTextGeometry.dispose();
        }
        if (this.levelTextMesh) {
            this.gameGroup.remove(this.levelTextMesh);
        }
        this.levelTextGeometry = undefined;
        this.levelTextMesh = undefined;
    }
    private destroyMeterials() {
        if (this.materialsTextGeometry) {
            this.materialsTextGeometry.dispose();
        }
        if (this.materialsTextMesh) {
            this.gameGroup.remove(this.materialsTextMesh);
        }
        this.materialsTextGeometry = undefined;
        this.materialsTextMesh = undefined;
    }

    private updateAtkDef() {
        const atk = this.card.currentAtk || this.card.atk;
        const def = this.card.currentAtk || this.card.def;

        if (atk === this.atk && this.def === def) return;

        this.destroyAtkDef();

        this.atk = atk;
        this.def = def;

        let atkDef = `${this.atk}`;

        if (!YGOGameUtils.isLinkMonster(this.card)) {
            atkDef += `/${this.def}`;
        }

        const textGeometry = new TextGeometry(atkDef, {
            font: this.duel.core.fonts.get("GameFont")!,
            size: 0.3,
            height: 0.05,
        });

        textGeometry.computeBoundingBox();
        const boundingBox = textGeometry.boundingBox!;

        const centerOffset = new THREE.Vector3();
        boundingBox.getCenter(centerOffset);

        textGeometry.translate(-centerOffset.x, -centerOffset.y, -centerOffset.z);

        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);

        textMesh.position.set(0, 0, 0);

        this.atkDefTextGeometry = textGeometry;
        this.atkDefTextMesh = textMesh;

        this.gameGroup.add(textMesh);
    }

    private updateLevel() {
        const level = this.card.level || this.card.linkval;

        if (this.level === level) return;

        this.destroyLevel();

        this.level = level;

        const textGeometry = new TextGeometry(String(this.level), {
            font: this.duel.core.fonts.get("GameFont")!,
            size: 0.3,
            height: 0.05,
        });

        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);

        textMesh.position.set(0.5, 1.5, 0);

        this.levelTextGeometry = textGeometry;
        this.levelTextMesh = textMesh;

        this.gameGroup.add(textMesh);
    }

    private updateMaterials() {
        if (!YGOGameUtils.isXYZMonster(this.card)) return;

        const materials = this.card.materials.length;

        if (this.materials === materials) return;

        this.destroyMeterials();

        this.materials = materials;


        const textGeometry = new TextGeometry(String(this.materials), {
            font: this.duel.core.fonts.get("GameFont")!,
            size: 0.3,
            height: 0.05,
        });

        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);

        textMesh.position.set(0, 2, 0);

        this.materialsTextGeometry = textGeometry;
        this.materialsTextMesh = textMesh;

        this.gameGroup.add(textMesh);
    }
}