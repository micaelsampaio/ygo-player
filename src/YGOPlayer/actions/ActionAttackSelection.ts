import * as THREE from 'three';
import { YGOAction } from "../core/components/YGOAction";
import { YGOComponent } from "../core/YGOComponent";
import { YGODuel } from "../core/YGODuel";
import { createCardSelectionGeometry } from "../game/meshes/CardSelectionMesh";
import { CardZone } from '../game/CardZone';
import { Ease } from '../scripts/ease';
import { lerp } from 'three/src/math/MathUtils';

export class ActionAttackSelection extends YGOComponent implements YGOAction {
  private selectionZones: Map<string, { cardSelection: THREE.Mesh }>;
  private zones!: CardZone[];
  private time: number = 0;
  private opacityValue: number = 0.0;

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
      ...field.extraMonsterZone.filter(cardZone => cardZone.hasCard()),
    ];
    return result;
  }

  private createZones() {
    for (const field of this.duel.fields) {
      for (const cardZone of field.monsterZone) {
        const cardSelection = this.createCardSelection(cardZone.position, cardZone.rotation);
        this.selectionZones.set(cardZone.zone, { cardSelection });
      }
    }

    for (const cardZone of this.duel.fields[0].extraMonsterZone) {
      const gameObject = this.createCardSelection(cardZone.position, cardZone.rotation);
      this.selectionZones.set("EMZ-" + cardZone.zoneData.zoneIndex, { cardSelection: gameObject });
      this.selectionZones.set("EMZ2-" + cardZone.zoneData.zoneIndex, { cardSelection: gameObject });
    }
  }

  startSelection({ zones, onSelectionCompleted }: { zones: CardZone[], onSelectionCompleted: (cardzone: CardZone) => void }) {
    zones.forEach(zone => {
      const { cardSelection: gameObject } = this.selectionZones.get(zone.zone)!;
      gameObject.visible = true;
      zone.onClickCb = () => {
        onSelectionCompleted(zone);
      }
    });

    this.zones = zones;
    this.duel.actionManager.setAction(this);
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
  }

  onActionEnd() {
    this.hideCardSelection();
    this.zones?.forEach(zone => zone.onClickCb = null);
  }

  private hideCardSelection() {
    this.selectionZones.values().forEach(({ cardSelection: gameObject }) => {
      gameObject.visible = false;
    })
  }

  private createCardSelection(position: THREE.Vector3, rotation: THREE.Euler) {
    const cardSelection = createCardSelectionGeometry(2.7, 3.75, 0.12);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 1, transparent: true });
    const cardSelectionMesh = new THREE.Mesh(cardSelection, material);

    cardSelectionMesh.position.copy(position);
    cardSelectionMesh.rotation.copy(rotation);
    cardSelectionMesh.position.z += 0.01;
    cardSelectionMesh.visible = false;
    this.duel.core.scene.add(cardSelectionMesh);

    return cardSelectionMesh;
  }
}