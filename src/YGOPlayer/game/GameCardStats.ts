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

    // canvas
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    // cached data to update
    private atk: number = -9;
    private def: number = -9;
    private level: number = -9;
    private materials: number = -9;
    private owner: number = -9;

    private texture: THREE.Texture;
    private mesh: THREE.Mesh;

    constructor({ parent, card, duel }: { parent: THREE.Object3D, card: Card, duel: YGODuel }) {
        this.parent = parent;
        this.card = card;
        this.duel = duel;

        this.canvas = document.createElement("canvas");
        this.canvas.width = 128;
        this.canvas.height = 128;
        this.ctx = this.canvas.getContext("2d")!;

        this.texture = new THREE.Texture(this.canvas)
        const material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true });
        this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), material);

        this.parent.add(this.mesh);
        this.mesh.position.set(0, -0.5, 0.2);
        this.mesh.visible = false;

        this.texture.colorSpace = THREE.SRGBColorSpace;
        this.texture.anisotropy = this.duel.core.renderer.capabilities.getMaxAnisotropy();

        // document.body.appendChild(this.canvas);
        // this.canvas.style.position = "fixed";
        // this.canvas.style.top = "50px";
        // this.canvas.style.right = "50px";
    }

    show() {
        this.mesh.visible = true;
    }

    hide() {
        this.mesh.visible = false;
    }

    destroy() {
        this.canvas = null as any;
        this.texture.dispose();
        this.parent.remove(this.mesh);
    }

    needsUpdate(): boolean {
        const atk = this.card.currentAtk || this.card.atk;
        const def = this.card.currentAtk || this.card.def;
        const level = this.card.level || this.card.linkval;
        const owner = this.card.owner;
        const materials = this.card.materials.length;

        if (this.atk !== atk) return true;
        if (this.def !== def) return true;
        if (this.level !== level) return true;
        if (this.owner !== owner) return true;
        if (this.materials !== materials) return true;

        return false;
    }

    render() {
        if (!this.needsUpdate()) return;

        const isPlayer1 = this.card.owner === 0;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // this.ctx.beginPath(); // Start a new path
        // this.ctx.rect(0, 0, 256, 256); // Add a rectangle to the current path
        // this.ctx.fillStyle = "rgba(0,0,255,0.3)"
        // this.ctx.fill(); // Render the path

        this.renderAtkDef();
        this.renderLevel();
        this.renderMaterials();

        this.texture.needsUpdate = true;

        if (YGOGameUtils.isAttack(this.card)) {
            this.mesh.position.set(0, -1, 0.2);
            this.mesh.rotation.set(0, 0, 0);
        } else {
            this.mesh.position.set(-1, 0, 0.2);
            this.mesh.rotation.set(0, 0, YGOMath.degToRad(-90));
        }

        if (!isPlayer1) {
            this.mesh.rotateZ(YGOMath.degToRad(180));
        }
    }

    renderAtkDef() {
        const isPlayer1 = this.card.owner === 0;
        const atk = this.card.currentAtk || this.card.atk;
        const def = this.card.currentAtk || this.card.def;

        const y = isPlayer1 ? this.canvas.height - 20 : 35;
        this.atk = atk;
        this.def = def;

        let atkDef = `${this.atk}`;

        if (!YGOGameUtils.isLinkMonster(this.card)) {
            atkDef += `/${this.def}`;
        }

        this.ctx.font = "Bold 20px Arial";
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.textAlign = "center";
        this.ctx.strokeStyle = "black";
        this.ctx.lineWidth = 2;
        this.ctx.strokeText(atkDef, this.canvas.width / 2, y);
        this.ctx.fillText(atkDef, this.canvas.width / 2, y);
    }

    renderLevel() {
        const isPlayer1 = this.card.owner === 0;
        const level = (this.card.level || this.card.linkval);
        const levelStr = String(level);
        let iconPath: string;
        let x = isPlayer1 ? this.canvas.width - 20 : 35;
        let y = isPlayer1 ? this.canvas.height - 50 : this.canvas.height - 60;

        if (YGOGameUtils.isLinkMonster(this.card)) {
            iconPath = `${this.duel.config.cdnUrl}/images/ui/ic_link128.png`;
        } else if (YGOGameUtils.isXYZMonster(this.card)) {
            iconPath = `${this.duel.config.cdnUrl}/images/ui/ic_rank128.png`;
        } else {
            iconPath = `${this.duel.config.cdnUrl}/images/ui/ic_stars128.png`;
        }

        const icon = this.duel.assets.getImage(iconPath);

        this.ctx.drawImage(icon, 0, 0, icon.width, icon.height, x - 30, y - 17, 20, 20);

        this.ctx.font = "Bold 20px Arial";
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.strokeStyle = "black";
        this.ctx.lineWidth = 2;
        this.ctx.strokeText(levelStr, x, y);
        this.ctx.fillText(levelStr, x, y);

        this.level = level as any;
    }

    renderMaterials() {
        if (!YGOGameUtils.isXYZMonster(this.card)) return;
        const isPlayer1 = this.card.owner === 0;
        const materials = this.card.materials.length;
        const materialsStr = String(materials);
        let iconPath = `${this.duel.config.cdnUrl}/images/ui/ic_xyz_materials128.png`;

        let x = isPlayer1 ? 5 : this.canvas.width - 50;
        let y = isPlayer1 ? this.canvas.height - 50 : this.canvas.height - 60;

        const icon = this.duel.assets.getImage(iconPath);

        this.ctx.drawImage(icon, 0, 0, icon.width, icon.height, x, y - 17, 20, 20);

        this.ctx.font = "Bold 20px Arial";
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.strokeStyle = "black";
        this.ctx.lineWidth = 2;
        this.ctx.strokeText(materialsStr, x + 30, y);
        this.ctx.fillText(materialsStr, x + 30, y);

        this.materials = materials;
    }
}