import * as THREE from 'three';
import type { YGOAction } from "../core/components/YGOAction";
import { YGOComponent } from "../core/YGOComponent";
import type { YGODuel } from "../core/YGODuel";
import { createCardSelectionGeometry } from "../game/meshes/CardSelectionMesh";
import type { CardZone } from '../game/CardZone';
import { Ease } from '../scripts/ease';
import { lerp } from 'three/src/math/MathUtils';
import type { GameHandZone } from '../game/GameHandZone';
import type { BattlePhaseButton } from '../game/BattlePhaseButton';
import { AimArrow } from '../duel-events/utils/battle-fx';

/** The pointer snaps the aiming arrow to a target this close to it (board units). */
const AIM_SNAP = 4;

enum STATE { SELECTION, PRE_ATTACK_MENU }
export class ActionAttackSelection extends YGOComponent implements YGOAction {
  private state = STATE.SELECTION;
  private selectionZones: Map<string, { cardSelection: THREE.Mesh }>;
  private zones!: CardZone[];
  private time: number = 0;
  private opacityValue: number = 0.0;
  private card: CardZone | undefined;
  private attackButton!: BattlePhaseButton;
  private aimArrow: AimArrow | null = null;
  private directTarget: THREE.Vector3 | null = null;
  private readonly raycaster = new THREE.Raycaster();
  private aimPlayer = 0;
  /** The target the arrow is snapped to ("" none, "direct", else a zone), for the "attack-aim" event. */
  private aimKey = "";

  constructor(private duel: YGODuel) {
    super("attack_selection_action");

    this.selectionZones = new Map();
  }

  public create() {
    this.createZones();
    this.hideCardSelection();
  }

  public getMonstersZonesToAttack(player: number) {
    const field = this.duel.fields[1 - player];
    const result: CardZone[] = [
      ...field.monsterZone.filter(cardZone => cardZone.hasCard()),
      ...field.extraMonsterZone.filter(cardZone => cardZone.hasCard() && cardZone.zoneData.player !== player),
    ];
    return result;
  }

  private createZones() {
    for (const field of this.duel.fields) {
      for (const cardZone of field.monsterZone) {
        const cardSelection = this.createCardSelection(cardZone.position, cardZone.rotation);
        this.selectionZones.set(cardZone.zone, { cardSelection });
      }
      const cardSelectionHand = this.createDirectAttackSelection(field.hand.gameHandZone);
      this.selectionZones.set("P" + field.playerIndex, { cardSelection: cardSelectionHand });
    }

    for (const cardZone of this.duel.fields[0].extraMonsterZone) {
      const gameObject = this.createCardSelection(cardZone.position, cardZone.rotation);
      this.selectionZones.set("EMZ-" + cardZone.zoneData.zoneIndex, { cardSelection: gameObject });
      this.selectionZones.set("EMZ2-" + cardZone.zoneData.zoneIndex, { cardSelection: gameObject });
    }
  }

  startSelection({ player, attackButton, cardZone, zones, directAttack }: { player: number, attackButton: BattlePhaseButton, cardZone: CardZone, zones: CardZone[], directAttack?: boolean }) {
    this.duel.actionManager.setAction(this);
    this.attackButton = attackButton;
    this.aimPlayer = player;

    this.directTarget = null;
    if (directAttack) {
      const playerId = "P" + (1 - player);
      const gameHandZone = this.duel.fields[1 - player].hand.gameHandZone;
      this.directTarget = gameHandZone.gameObject.position.clone();
      this.selectionZones.get(playerId)!.cardSelection.visible = true;
      gameHandZone.gameObject.visible = true;
      gameHandZone.onClickCb = () => {
        this.duel.events.dispatch("clear-ui-action");
        this.duel.gameActions.attackDirectly({
          id: cardZone.getCardReference()!.id,
          originZone: cardZone.zone
        })
      }
    }

    zones.forEach(zone => {

      const { cardSelection: gameObject } = this.selectionZones.get(zone.zone)!;
      gameObject.visible = true;

      zone.onClickCb = () => {
        this.state = STATE.PRE_ATTACK_MENU;
        this.hideCardSelection();

        this.duel.events.dispatch("set-ui-action", {
          type: "card-zone-attack-menu",
          data: {
            attackedZone: zone.zone,
            attackedCard: zone.getCardReference(),
            attackedGameCard: zone.getGameCard(),

            attackingZone: cardZone.zone,
            attackingCard: cardZone.getCardReference(),
            attackingGameCard: cardZone.getGameCard(),

            player
          }
        });
      }
    });

    this.card = cardZone;
    this.zones = zones;
    this.state = STATE.SELECTION;

    this.duel.events.dispatch("set-ui-action", {
      type: "card-attack-selection", data: {}
    });
  }

  updateAction() {
    this.time += this.duel.core.unscaledDeltaTime * 10;
    const oscillator = (Math.sin(this.time) + 1) / 2;
    const easedValue = Ease.linear(oscillator);
    this.opacityValue = lerp(0.3, 1, easedValue);

    const meshPos = new THREE.Vector3();
    this.attackButton.gameObject.getWorldPosition(meshPos);
    const screenPos = meshPos.clone().project(this.duel.core.camera);
    const dx = this.duel.mouseEvents.mousePositionOnScreen.x - screenPos.x;
    const dy = this.duel.mouseEvents.mousePositionOnScreen.y - screenPos.y;
    const angle = Math.atan2(dy, dx) - Math.PI / 2;

    this.attackButton.gameObject.rotation.z = angle;

    for (const [, { cardSelection }] of this.selectionZones) {
      const cardMaterial = cardSelection.material as THREE.Material;
      cardMaterial.opacity = this.opacityValue;
    }

    if (this.card) {
      const startY = this.card.position.y;
      const yOscillator = Math.sin(this.time / 2) * 0.5;
      this.card.getGameCard().gameObject.position.y = startY + yOscillator;
    }

    if (this.state === STATE.SELECTION && this.card) this.updateAimArrow();
    else { this.aimArrow?.hide(); this.setAim(null); }
  }

  /** The aiming arrow from the attacker to the pointer on the board, snapped to the target under it. */
  private updateAimArrow() {
    const from = this.card!.position;
    const pointer = this.duel.mouseEvents.mousePositionOnScreen;
    this.raycaster.setFromCamera(new THREE.Vector2(pointer.x, pointer.y), this.duel.core.camera);
    const board = new THREE.Plane(new THREE.Vector3(0, 0, 1), -from.z);
    const hit = this.raycaster.ray.intersectPlane(board, new THREE.Vector3());
    if (!hit) { this.setAim(null); return this.aimArrow?.hide(); }
    const targets = [...(this.zones ?? []).map((z) => ({ pos: z.position, zone: z.zone })), ...(this.directTarget ? [{ pos: this.directTarget, zone: null }] : [])];
    let to = hit;
    let best = AIM_SNAP;
    let snapped: { pos: THREE.Vector3; zone: string | null } | null = null;
    for (const t of targets) {
      const d = Math.hypot(t.pos.x - hit.x, t.pos.y - hit.y);
      if (d < best) { best = d; to = t.pos; snapped = t; }
    }
    this.setAim(snapped);
    if (!this.aimArrow) this.aimArrow = new AimArrow(this.duel);
    this.aimArrow.show(from, to, this.duel.core.unscaledDeltaTime);
  }

  /** Tells the UI (battle forecast) when the snapped target changes. */
  private setAim(target: { pos: THREE.Vector3; zone: string | null } | null) {
    const key = !target || !this.card ? "" : target.zone ?? "direct";
    if (key === this.aimKey) return;
    this.aimKey = key;
    this.duel.events.dispatch("attack-aim", !target || !this.card ? null : {
      player: this.aimPlayer,
      attackerZone: this.card.zone,
      targetZone: target.zone,
      direct: target.zone === null,
      position: { x: target.pos.x, y: target.pos.y, z: target.pos.z },
    });
  }

  onActionEnd() {
    this.setAim(null);
    this.aimArrow?.hide();
    this.hideCardSelection();

    this.attackButton?.gameObject.rotation.copy(this.attackButton.rotation);

    this.zones?.forEach(zone => zone.onClickCb = null);

    if (this.card) {
      this.card.getGameCard().gameObject.position.copy(this.card.position);
      this.card = undefined;
    }
  }

  private hideCardSelection() {
    this.selectionZones.values().forEach(({ cardSelection: gameObject }) => {
      gameObject.visible = false;
    })
    this.selectionZones.get("P0")!.cardSelection.parent!.visible = false;
    this.selectionZones.get("P1")!.cardSelection.parent!.visible = false;
  }

  private createCardSelection(position: THREE.Vector3, rotation: THREE.Euler) {
    const cardSelection = createCardSelectionGeometry(3, 4, 0.15);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 1, transparent: true });
    const cardSelectionMesh = new THREE.Mesh(cardSelection, material);

    cardSelectionMesh.position.copy(position);
    cardSelectionMesh.rotation.copy(rotation);
    cardSelectionMesh.position.z += 0.01;
    cardSelectionMesh.visible = false;
    this.duel.core.scene.add(cardSelectionMesh);

    return cardSelectionMesh;
  }

  private createDirectAttackSelection(gameHandZone: GameHandZone) {
    const cardSelection = createCardSelectionGeometry(15, 6, 0.15);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 1, transparent: true });
    const cardSelectionMesh = new THREE.Mesh(cardSelection, material);

    cardSelectionMesh.position.set(0, 0, 0);
    cardSelectionMesh.rotation.set(0, 0, 0.01);
    cardSelectionMesh.visible = false;

    gameHandZone.gameObject.add(cardSelectionMesh);

    return cardSelectionMesh;
  }
}