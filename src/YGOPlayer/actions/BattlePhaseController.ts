import * as THREE from 'three';
import { YGOComponent } from "../core/YGOComponent";
import { YGODuel } from "../core/YGODuel";
import { CardZone } from "../game/CardZone";
import { YGODuelPhase } from 'ygo-core';
import { YGOMouseEvents } from '../core/components/YGOMouseEvents';
import { ActionAttackSelection } from './ActionAttackSelection';

export class BattlePhaseController extends YGOComponent {

  private attackObjects: Map<string, any>;

  constructor(name: string, private duel: YGODuel) {
    super(name);
    this.attackObjects = new Map();
    this.enabled = false;

    duel.fields.forEach(player => {
      player.monsterZone.forEach(zone => this.attackObjects.set(zone.zone, createAttackZone(duel, zone)));
    })

    this.hideBattlePhaseIcons();

    duel.ygo.events.on("set-duel-phase", ({ phase }) => {
      if (phase === YGODuelPhase.Battle) {
        this.enabled = true;
      } else {
        this.enabled = false;
        this.attackObjects.values().forEach(g => {
          g.gameObject.visible = false;
          g.isUiElementClick = false;
        });
      }
    })

    duel.events.on("enable-game-actions", () => {
      if (this.enabled) {
        this.showBattlePhaseIcons(this.duel.ygo.state.turnPlayer);
      }
    });

    duel.events.on("disable-game-actions", () => {
      if (this.enabled) {
        this.hideBattlePhaseIcons();
      }
    });
  }

  private hideBattlePhaseIcons() {
    this.attackObjects.values().forEach(g => {
      g.gameObject.visible = false;
      g.isUiElementClick = false;
    });
  }

  private showBattlePhaseIcons(turnPlayer: number) {
    this.attackObjects.values().forEach(g => {
      g.gameObject.visible = g.zone.hasCard() && g.zone.player === turnPlayer;
      g.onMouseClick = () => {
        const battleAction = this.duel.gameController.getComponent<ActionAttackSelection>("attack_selection_action")
        const zones = battleAction.getMonstersZonesToAttack(g.zone.zoneData.player);
        const attackingCard = g.zone.getCardReference()!;

        battleAction.startSelection({
          zones, onSelectionCompleted: (zone) => {
            const attackedCard = zone.getCardReference()!;
            this.duel.gameActions.attack({
              attackingId: attackingCard.id,
              attackingZone: g.zone.zone,
              attackedId: attackedCard.id,
              attackedZone: zone.zone
            })
          }
        });
      }
    });
  }
}

function createAttackZone(duel: YGODuel, zone: CardZone) {
  const positions = new Float32Array([
    0, 1, 0,
    -1, -1, 0,
    1, -1, 0,
  ]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshBasicMaterial({
    color: 0xff0000,
  });

  const triangle = new THREE.Mesh(geometry, material);
  triangle.position.copy(zone.position);
  triangle.position.z += 0.5;

  const uielement = {
    gameObject: triangle,
    zone: zone,
    isUiElement: true,
    isUiElementClick: true,
    onMouseClick() {
    }
  };

  duel.core.scene.add(triangle);
  duel.gameController.getComponent<YGOMouseEvents>("mouse_events")?.registerElement(uielement);

  return uielement;
}