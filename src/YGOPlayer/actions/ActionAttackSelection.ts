import * as THREE from 'three';
import { YGOAction } from "../core/components/YGOAction";
import { YGOComponent } from "../core/YGOComponent";
import { YGODuel } from "../core/YGODuel";
import { createCardSelectionGeometry } from "../game/meshes/CardSelectionMesh";
import { CardZone } from '../game/CardZone';
import { Ease } from '../scripts/ease';
import { lerp } from 'three/src/math/MathUtils';
import { GameHandZone } from '../game/GameHandZone';

enum STATE { SELECTION, PRE_ATTACK_MENU }
export class ActionAttackSelection extends YGOComponent implements YGOAction {
  private state = STATE.SELECTION;
  private selectionZones: Map<string, { cardSelection: THREE.Mesh }>;
  private selectedZone: CardZone | undefined;
  private zones!: CardZone[];
  private time: number = 0;
  private opacityValue: number = 0.0;
  private card: CardZone | undefined;
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

  startSelection({ player, cardZone, zones, directAttack }: { player: number, cardZone: CardZone, zones: CardZone[], directAttack?: boolean }) {
    this.duel.actionManager.setAction(this);

    if (directAttack) {
      const playerId = "P" + (1 - player);
      const gameHandZone = this.duel.fields[1 - player].hand.gameHandZone;
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
        this.selectedZone = zone;
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

    for (const [, { cardSelection }] of this.selectionZones) {
      const cardMaterial = cardSelection.material as THREE.Material;
      //const zoneMaterial = zoneData.zone.material as THREE.Material;
      cardMaterial.opacity = this.opacityValue;
      // zoneMaterial.opacity = this.opacityValue;
    }

    if (this.card) {
      const startY = this.card.position.y;
      const yOscillator = Math.sin(this.time / 2) * 0.5;
      this.card.getGameCard().gameObject.position.y = startY + yOscillator;
    }
  }

  onActionEnd() {
    this.hideCardSelection();
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