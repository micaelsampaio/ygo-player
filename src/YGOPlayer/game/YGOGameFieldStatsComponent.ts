import * as THREE from 'three';
import { PlayerField } from "ygo-core/dist/types/types";
import { YGODuel } from "../core/YGODuel";

export class YGOGameFieldStatsComponent {
    public stats: YGOGameFieldStatsRender[];

    constructor(duel: YGODuel) {
        this.stats = [0, 1].map(playerIndex => new YGOGameFieldStatsRender(duel, playerIndex));

        for (let i = 0; i < this.stats.length; ++i) {
            this.stats[i].hide();
        }

        window.addEventListener("mousedown", (event) => {
            if (event.button === 1) {
                event.preventDefault();
                this.show();
            }
        });

        window.addEventListener("mouseup", (event) => {
            if (event.button === 1) {
                event.preventDefault();
                this.hide();
            }
        });
    }

    public show() {
        for (let i = 0; i < this.stats.length; ++i) {
            this.stats[i].show();
        }
    }

    public hide() {
        for (let i = 0; i < this.stats.length; ++i) {
            this.stats[i].hide();
        }
    }

    public update() {
        for (let i = 0; i < this.stats.length; ++i) {
            this.stats[i].render();
        }
    }
}

class YGOGameFieldStatsRender {

    private currentStats: {
        normalSummons: number
        specialSummons: number
        fieldAtk: number
    };

    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private imageTexture: HTMLImageElement;
    private mesh: THREE.Mesh;
    private canvasTexture: THREE.CanvasTexture;

    constructor(private duel: YGODuel, private player: number) {
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d")!;
        this.currentStats = { normalSummons: -1, specialSummons: -1, fieldAtk: -1 };
        this.imageTexture = duel.assets.getImage(`${duel.config.cdnUrl}/images/ui/card_icons.png`);

        this.canvas.width = 450;
        this.canvas.height = 200;

        const canvasTexture = new THREE.CanvasTexture(this.canvas);
        canvasTexture.needsUpdate = true;

        const material = new THREE.MeshBasicMaterial({
            map: canvasTexture,
            transparent: true,
        });

        const aspectRatio = this.canvas.width / this.canvas.height;
        const planeWidth = 5;
        const planeHeight = planeWidth / aspectRatio;
        const planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
        this.mesh = new THREE.Mesh(planeGeometry, material);

        if (player === 0) {
            this.mesh.position.set(8.5, 0.15 - 2, 1);
        } else {
            this.mesh.position.set(-8.5, 0.15 + 2, 1);
        }

        this.canvasTexture = canvasTexture;

        duel.core.scene.add(this.mesh);

    }

    private shouldRender(field: PlayerField) {
        if (field.stats.normalSummons !== this.currentStats.normalSummons) return true;
        if (field.stats.specialSummons !== this.currentStats.specialSummons) return true;
        if (field.stats.fieldAtk !== this.currentStats.fieldAtk) return true;

        return false;
    }

    render() {
        const field = this.duel.ygo.getField(this.player)!;
        if (!this.shouldRender(field)) return;

        this.currentStats = { ...field.stats };

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const halfWidth = this.canvas.width / 2;
        const halfHeight = this.canvas.height / 2;
        const spacing = 10;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, this.canvas.width, halfHeight);
        ctx.fillRect(0, halfHeight + spacing, halfWidth - spacing / 2, halfHeight - spacing);
        ctx.fillRect(halfWidth + spacing, halfHeight + spacing, halfWidth - spacing / 2, halfHeight - spacing);

        this.drawIcon(0, 2, 80, 80, 20, 45);
        this.drawText("TOTAL", 80, 80, "24px Arial", "white", "left");
        this.drawText(field.stats.fieldAtk.toString(), this.canvas.width - 40, 75, "bold 75px Arial", "white", "right");

        this.drawIcon(0, 3, 60, 60, 30, halfHeight + spacing + 45);
        this.drawText(field.stats.normalSummons.toString(), 120, halfHeight + spacing + 65, "bold 60px Arial", "white", "left");

        this.drawIcon(0, 4, 60, 60, halfWidth + spacing + 30, halfHeight + spacing + 45);
        this.drawText(field.stats.specialSummons.toString(), halfWidth + spacing + 120, halfHeight + spacing + 65, "bold 60px Arial", "white", "left");

        this.canvasTexture.needsUpdate = true;
    }

    private drawSection(x: number, y: number, width: number, height: number, isMain: boolean) {
        const ctx = this.ctx;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
    }

    private drawIcon(spriteX: number, spriteY: number, size: number, destSize: number, x: number, y: number) {
        const spriteSize = 128;
        this.ctx.drawImage(
            this.imageTexture,
            spriteY * spriteSize, spriteX * spriteSize,
            spriteSize, spriteSize,
            x, y - destSize / 2,
            destSize, destSize
        );
    }

    private drawText(text: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign, baseline: CanvasTextBaseline = "alphabetic") {
        const ctx = this.ctx;
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textBaseline = baseline;
        ctx.textAlign = align as CanvasTextAlign;
        ctx.fillText(text, x, y);
    }

    show() {
        this.mesh.visible = true;
    }

    hide() {
        this.mesh.visible = false;
    }
}