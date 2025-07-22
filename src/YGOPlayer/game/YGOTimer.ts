import * as THREE from 'three';
import { YGOEntity } from "../core/YGOEntity";
import { YGODuel } from '../core/YGODuel';
import { YGOTaskSequence } from '../core/components/tasks/YGOTaskSequence';
import { ScaleTransition } from '../duel-events/utils/scale-transition';
import { WaitForSeconds } from '../duel-events/utils/wait-for-seconds';

export class YGOTimer extends YGOEntity {
  private time: number = 0; // time in seconds now
  private running: boolean = false;
  private countingDown: boolean = false;
  private countdownFinished: boolean = false;
  private lastTimeString: string = "";
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public texture: THREE.Texture;
  public mesh: THREE.Mesh;
  private firstUpdate: boolean;

  constructor(private duel: YGODuel, private position: THREE.Vector3) {
    super();

    this.canvas = document.createElement("canvas");
    this.canvas.width = 128;
    this.canvas.height = 128;
    this.firstUpdate = false;
    this.ctx = this.canvas.getContext("2d")!;

    this.texture = new THREE.Texture(this.canvas);
    const material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), material);
    this.mesh.position.copy(this.position);
    this.mesh.position.z += 0.42;
    this.duel.core.scene.add(this.mesh);
    this.duel.add(this);

    // Initial draw with 00
    this.drawText("0");
  }

  update(dt: number): void {
    if (!this.running) return;

    if (this.firstUpdate) { // fix delay that prompt creates
      dt = 0;
      this.firstUpdate = false;
    }

    let timeChanged = false;
    if (this.running && !this.countdownFinished) {
      if (this.countingDown) {
        this.time -= dt;
        if (this.time <= 0) {
          this.time = 0;
          this.countdownFinished = true;
          this.running = false;
        }
      } else {
        this.time += dt;
      }

      timeChanged = true;
    }

    const currentStr = this.toString();

    if (timeChanged && currentStr !== this.lastTimeString) {

      if (this.countingDown && this.time < 10) {
        this.duel.tasks.startTask(
          new YGOTaskSequence(

            new ScaleTransition({
              gameObject: this.mesh,
              scale: new THREE.Vector3(2, 2, 2),
              duration: 0.15
            }),
            new WaitForSeconds(0.1),
            new ScaleTransition({
              gameObject: this.mesh,
              scale: new THREE.Vector3(1, 1, 1),
              duration: 0.1
            })
          )
        )
      }

      this.drawText(currentStr);
      this.lastTimeString = currentStr;
    }

    if (!this.running && this.lastTimeString !== "00") {
      this.drawText("0");
      this.lastTimeString = "0";
    }
  }

  startTimer(): void {
    this.time = 0;
    this.running = true;
    this.countingDown = false;
    this.countdownFinished = false;
    this.firstUpdate = true;
  }

  // timeInSeconds instead of milliseconds
  startCountDown(timeInSeconds: number): void {
    this.time = timeInSeconds;
    this.running = true;
    this.countingDown = true;
    this.countdownFinished = false;
    this.firstUpdate = true;
    const currentStr = this.toString();
    this.drawText(currentStr);
    this.lastTimeString = currentStr;
  }

  pauseTimer(): void {
    this.running = false;
  }

  stopTimer(): void {
    this.running = false;
    this.time = 0;
    this.countdownFinished = false;
    this.drawText("0");
    this.lastTimeString = "0";
  }

  toString(): string {
    const totalSeconds = Math.floor(this.time);
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
      return String(seconds);
    }
  }

  private drawText(text: string) {
    const ctx = this.ctx;
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
    // ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let fontSize = 55;
    const maxWidth = canvasWidth * 0.65;

    do {
      ctx.font = `bold ${fontSize}px Arial`;
      const metrics = ctx.measureText(text);
      if (metrics.width <= maxWidth) break;
      fontSize -= 1;
    } while (fontSize > 10);

    ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);
    this.texture.needsUpdate = true;
  }

}
