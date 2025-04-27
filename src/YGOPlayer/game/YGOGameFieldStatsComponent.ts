import * as THREE from "three";
import { PlayerField } from "ygo-core";
import { YGODuel } from "../core/YGODuel";

export class YGOGameFieldStatsComponent {
  public stats: YGOGameFieldStatsRender[];

  constructor(duel: YGODuel) {
    this.stats = [0, 1].map(
      (playerIndex) => new YGOGameFieldStatsRender(duel, playerIndex)
    );

    for (let i = 0; i < this.stats.length; ++i) {
      this.stats[i].hide();
    }

    // TODO @RMS: HANDLE THIS BETTER
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
    normalSummons: number;
    specialSummons: number;
    fieldAtk: number;
  };

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageTexture: HTMLImageElement;
  private mesh: THREE.Mesh;
  private canvasTexture: THREE.CanvasTexture;

  private gyCounter: CounterRender;
  private banishedZoneCounter: CounterRender;
  private handCounter: CounterRender;
  private extraDeckCounter: CounterRender;
  private deckCounter: CounterRender;

  constructor(private duel: YGODuel, private player: number) {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;
    this.currentStats = { normalSummons: -1, specialSummons: -1, fieldAtk: -1 };
    this.imageTexture = duel.assets.getImage(
      `${duel.config.cdnUrl}/images/ui/card_icons.png`
    );

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
      this.mesh.position.set(-8.25, 0.15 - 1.5, 2);
    } else {
      this.mesh.position.set(8.25, 1.5 - 0.15, 2);
    }

    this.canvasTexture = canvasTexture;

    const heightOffset = new THREE.Vector3(0, 0, 1);
    const gameField = this.duel.fields[this.player];
    const gyPos = gameField.graveyard.position.clone().add(heightOffset);
    const banishedzonePos = gameField.banishedZone.position.clone().add(heightOffset);
    const deckPos = gameField.mainDeck.gameObject.position.clone().add(new THREE.Vector3(this.player === 0 ? -1.6 : 1.6, this.player === 0 ? 1.5 : -1.5, 3));
    const extraDeckPos = gameField.extraDeck.gameObject.position.clone().add(new THREE.Vector3(this.player === 0 ? 1.6 : -1.6, this.player === 0 ? 1.5 : -1.5, 3));

    this.handCounter = new CounterRender(duel, new THREE.Vector3(0, this.player === 0 ? -7.5 : 7.5, 3), () => this.duel.ygo.getField(this.player)!.hand.length);
    this.deckCounter = new CounterRender(duel, deckPos, () => this.duel.ygo.getField(this.player)!.mainDeck.length);
    this.extraDeckCounter = new CounterRender(duel, extraDeckPos, () => this.duel.ygo.getField(this.player)!.extraDeck.length);
    this.gyCounter = new CounterRender(duel, gyPos, () => this.duel.ygo.getField(this.player)!.graveyard.length);
    this.banishedZoneCounter = new CounterRender(duel, banishedzonePos, () => this.duel.ygo.getField(this.player)!.banishedZone.length);

    duel.core.scene.add(this.mesh);
  }

  private shouldRenderFieldStats(field: PlayerField) {
    if (field.stats.normalSummons !== this.currentStats.normalSummons)
      return true;
    if (field.stats.specialSummons !== this.currentStats.specialSummons)
      return true;
    if (field.stats.fieldAtk !== this.currentStats.fieldAtk) return true;

    return false;
  }

  render() {
    const field = this.duel.ygo.getField(this.player)!;

    this.renderFieldStats(field);
    this.handCounter.render();
    this.deckCounter.render();
    this.extraDeckCounter.render();
    this.gyCounter.render();
    this.banishedZoneCounter.render();
  }

  renderFieldStats(field: PlayerField) {
    if (!this.shouldRenderFieldStats(field)) return;

    this.currentStats = { ...field.stats };

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const halfWidth = this.canvas.width / 2;
    const halfHeight = this.canvas.height / 2;
    const spacing = 10;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, this.canvas.width, halfHeight);
    ctx.fillRect(
      0,
      halfHeight + spacing,
      halfWidth - spacing / 2,
      halfHeight - spacing
    );
    ctx.fillRect(
      halfWidth + spacing,
      halfHeight + spacing,
      halfWidth - spacing / 2,
      halfHeight - spacing
    );

    this.drawIcon(0, 2, 80, 80, 20, 45);
    this.drawText("TOTAL", 80, 80, "24px Arial", "white", "left");
    this.drawText(
      field.stats.fieldAtk.toString(),
      this.canvas.width - 40,
      75,
      "bold 75px Arial",
      "white",
      "right"
    );

    this.drawIcon(0, 3, 60, 60, 30, halfHeight + spacing + 45);
    this.drawText(
      field.stats.normalSummons.toString(),
      120,
      halfHeight + spacing + 65,
      "bold 60px Arial",
      "white",
      "left"
    );

    this.drawIcon(
      0,
      4,
      60,
      60,
      halfWidth + spacing + 30,
      halfHeight + spacing + 45
    );
    this.drawText(
      field.stats.specialSummons.toString(),
      halfWidth + spacing + 120,
      halfHeight + spacing + 65,
      "bold 60px Arial",
      "white",
      "left"
    );

    this.canvasTexture.needsUpdate = true;
  }

  private drawSection(
    x: number,
    y: number,
    width: number,
    height: number,
    isMain: boolean
  ) {
    const ctx = this.ctx;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  }

  private drawIcon(
    spriteX: number,
    spriteY: number,
    size: number,
    destSize: number,
    x: number,
    y: number
  ) {
    const spriteSize = 128;
    this.ctx.drawImage(
      this.imageTexture,
      spriteY * spriteSize,
      spriteX * spriteSize,
      spriteSize,
      spriteSize,
      x,
      y - destSize / 2,
      destSize,
      destSize
    );
  }

  private drawText(
    text: string,
    x: number,
    y: number,
    font: string,
    color: string,
    align: CanvasTextAlign,
    baseline: CanvasTextBaseline = "alphabetic"
  ) {
    const ctx = this.ctx;
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textBaseline = baseline;
    ctx.textAlign = align as CanvasTextAlign;
    ctx.fillText(text, x, y);
  }

  show() {
    this.mesh.visible = true;
    this.handCounter.mesh.visible = true;
    this.deckCounter.mesh.visible = true;
    this.extraDeckCounter.mesh.visible = true;
    this.gyCounter.mesh.visible = true;
    this.banishedZoneCounter.mesh.visible = true;
  }

  hide() {
    this.mesh.visible = false;
    this.handCounter.mesh.visible = false;
    this.deckCounter.mesh.visible = false;
    this.extraDeckCounter.mesh.visible = false;
    this.gyCounter.mesh.visible = false;
    this.banishedZoneCounter.mesh.visible = false;
  }
}

class CounterRender {

  private currentValue: any;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public mesh: THREE.Mesh;
  private canvasTexture: THREE.CanvasTexture;

  constructor(private duel: YGODuel, private pivot: THREE.Vector3, private getValue: any) {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;
    this.currentValue = -1;

    this.canvas.width = 100;
    this.canvas.height = 100;

    const canvasTexture = new THREE.CanvasTexture(this.canvas);
    canvasTexture.needsUpdate = true;

    const material = new THREE.MeshBasicMaterial({
      map: canvasTexture,
      transparent: true,
    });

    const planeWidth = 1.5;
    const planeHeight = 1.5;
    const planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    this.mesh = new THREE.Mesh(planeGeometry, material);
    this.mesh.position.copy(this.pivot)
    this.canvasTexture = canvasTexture;

    duel.core.scene.add(this.mesh);
  }

  render() {
    if (this.currentValue === this.getValue()) return;
    this.currentValue = this.getValue();

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const text = this.currentValue.toString();
    this.ctx.font = "bold 40px Arial";

    const textMetrics = this.ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = 30;

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    const padding = 25;

    // this.ctx.fillStyle = "rgba(1, 0, 0, 0.5)";
    // this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(
      centerX - textWidth / 2 - padding,
      centerY - textHeight / 2 - padding,
      textWidth + padding * 2,
      textHeight + padding * 2
    );

    this.ctx.fillStyle = "white";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(text, centerX, centerY);

    this.canvasTexture.needsUpdate = true;
  }


}
