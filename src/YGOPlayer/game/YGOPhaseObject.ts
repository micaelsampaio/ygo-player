import * as THREE from 'three';
import { YGODuel } from "../core/YGODuel";
import { YGOEntity } from '../core/YGOEntity';
import { YGOMouseEvents } from '../core/components/YGOMouseEvents';
import { YGOUiElement } from '../types';
import { YGOClientType, YGODuelPhase } from 'ygo-core';
import { ActionUiMenu } from '../actions/ActionUiMenu';
import { YGOStatic } from '../core/YGOStatic';
import { phaseLabel, phaseObjectTooltip, turnOwnerLabel } from '../ui/duel-status';

export class YGOPhaseObject extends YGOEntity implements YGOUiElement {
  public isUiElement: boolean = true;
  private fieldTurnHover: THREE.Mesh;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public texture: THREE.Texture;
  public action: ActionUiMenu;
  private tooltip = "";
  private hovered = false;

  constructor(private duel: YGODuel) {
    super();

    const fieldObject = this.duel.assets.models.get(this.duel.createCdnUrl("/models/field_objects.glb"))?.scene.clone()!;
    const fieldTurn = fieldObject.children.find(children => children.name === "player_turn")!;
    const fieldTurnPlaceHolder = fieldObject.children.find(children => children.name === "player_turn_placeholder")!.clone()! as THREE.Mesh;
    this.fieldTurnHover = fieldObject.children.find(children => children.name === "player_turn_hover")!.clone() as THREE.Mesh;

    fieldTurn.add(fieldTurnPlaceHolder);
    fieldTurn.rotation.set(THREE.MathUtils.degToRad(90), 0, 0);
    this.fieldTurnHover.rotation.set(THREE.MathUtils.degToRad(90), 0, 0);

    this.canvas = document.createElement("canvas");
    this.canvas.width = 256;
    this.canvas.height = 256;
    this.ctx = this.canvas.getContext("2d")!;
    this.texture = new THREE.Texture(this.canvas);

    const turnMaterial = new THREE.MeshBasicMaterial({ map: this.texture });//map: this.textures[0] });
    fieldTurnPlaceHolder.material = turnMaterial;

    const normalMaterial = new THREE.MeshBasicMaterial({ color: 0x00555, transparent: true, opacity: 0 });
    const geometry = new THREE.BoxGeometry(3, 3, 0.1);
    const clickElement = new THREE.Mesh(geometry, normalMaterial);
    clickElement.position.set(8, 0, 0.5);

    clickElement.add(fieldTurn);
    clickElement.add(this.fieldTurnHover);

    fieldTurn.position.set(0, 0, -0.5);
    fieldTurnPlaceHolder.position.set(0, -0.1, 0);
    fieldTurnPlaceHolder.rotation.set(0, 0, 0);

    this.gameObject = clickElement;

    const fieldTurnHoverMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.5 });
    this.fieldTurnHover.material = fieldTurnHoverMaterial;
    this.fieldTurnHover.visible = false;
    this.fieldTurnHover.position.set(0, 0, -0.5);

    this.duel.gameController.getComponent<YGOMouseEvents>("mouse_events")?.registerElement(this);
    this.duel.core.scene.add(this.gameObject);

    this.gameObject.scale.set(1, 1, 1);

    this.updateTexture(1, 0, YGODuelPhase.Draw);

    this.action = new ActionUiMenu(duel, { eventType: "duel-phase-menu", eventData: { duel: this.duel, transform: this.gameObject } });

    this.duel.ygo.events.on("set-duel-turn", ({ turn, turnPlayer }) => {
      this.updateTexture(turn, turnPlayer, YGODuelPhase.Draw);
    })

    this.duel.ygo.events.on("set-duel-phase", ({ phase, turnPlayer }) => {
      const turn = this.duel.ygo.state.turn;
      this.updateTexture(turn, turnPlayer, phase);
    })
  }

  onMouseClick(): void {
    this.duel.actionManager.setAction(this.action);
  }

  onMouseEnter(): void {
    this.fieldTurnHover.visible = true;
    this.hovered = true;
    // The object lives inside the WebGL canvas, so the cursor and native
    // tooltip have to be set on the canvas itself while it's hovered.
    const canvas = this.duel.core.renderer.domElement;
    canvas.style.cursor = "pointer";
    canvas.title = this.tooltip;
  }

  onMouseLeave(): void {
    this.fieldTurnHover.visible = false;
    this.hovered = false;
    const canvas = this.duel.core.renderer.domElement;
    canvas.style.cursor = "";
    canvas.removeAttribute("title");
  }

  private updateTexture(turnProp: number, turnPlayer: number, phase: YGODuelPhase) {
    const turn = Math.max(turnProp, 1);
    const ctx = this.ctx;
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Background gradient
    const playerColor = YGOStatic.isPlayerPOV(turnPlayer) ? "rgb(29, 78, 216)" : "rgb(185, 28, 28)";
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, playerColor);
    gradient.addColorStop(1, "black");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Whose turn, in words — the blue/red gradient alone isn't enough for
    // colour-blind or first-time players. Spectators get the player's name.
    const isPlayerClient = this.duel.client?.type === YGOClientType.PLAYER;
    const owner = isPlayerClient
      ? turnOwnerLabel({ isPlayerClient, isLocalTurn: YGOStatic.isPlayer(turnPlayer) })
      : this.duel.ygo.getField(turnPlayer)?.player?.name ?? "";
    this.fillFittedText(owner.toUpperCase(), centerX, centerY - 64, "bold", 26, canvasWidth - 24);

    this.fillFittedText(`Turn ${turn}`, centerX, centerY - 20, "bold", 40, canvasWidth - 24);

    // Phase text (smaller, below turn)
    this.fillFittedText(phaseLabel(phase), centerX, centerY + 26, "", 30, canvasWidth - 24);

    this.tooltip = phaseObjectTooltip({ owner, turn, phase, canChangePhase: isPlayerClient });
    if (this.hovered) this.duel.core.renderer.domElement.title = this.tooltip;

    // Border for style
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, canvasWidth - 4, canvasHeight - 4);

    this.texture.needsUpdate = true;
  }

  /** Draws centred text, shrinking the font until it fits maxWidth. */
  private fillFittedText(text: string, x: number, y: number, weight: string, size: number, maxWidth: number) {
    const ctx = this.ctx;
    let fontSize = size;
    ctx.font = `${weight} ${fontSize}px sans-serif`.trim();
    while (fontSize > 12 && ctx.measureText(text).width > maxWidth) {
      fontSize -= 2;
      ctx.font = `${weight} ${fontSize}px sans-serif`.trim();
    }
    ctx.fillText(text, x, y);
  }
}
