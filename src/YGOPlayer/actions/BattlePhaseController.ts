import * as THREE from 'three';
import { YGOComponent } from "../core/YGOComponent";
import { YGODuel } from "../core/YGODuel";
import { CardZone } from "../game/CardZone";
import { YGODuelPhase } from 'ygo-core';
import { YGOMouseEvents } from '../core/components/YGOMouseEvents';
import { ActionAttackSelection } from './ActionAttackSelection';

export class BattlePhaseController extends YGOComponent {

  private attackObjects: Map<string, any>;

  constructor(name: string, duel: YGODuel) {
    super(name);
    this.attackObjects = new Map();

    duel.fields.forEach(player => {
      player.monsterZone.forEach(zone => this.attackObjects.set(zone.zone, createAttackZone(duel, zone)));
    })

    this.attackObjects.values().forEach(g => g.gameObject.visible = false);

    duel.ygo.events.on("set-duel-phase", ({ phase, turnPlayer }) => {
      if (phase === YGODuelPhase.Battle) {
        this.attackObjects.values().forEach(g => {
          g.gameObject.visible = g.zone.hasCard() && g.zone.player === turnPlayer;
          g.onMouseClick = () => {
            const battleAction = duel.gameController.getComponent<ActionAttackSelection>("attack_selection_action")
            const zones = battleAction.getMonstersZonesToAttack(g.zone.zoneData.player);
            const attackingCard = g.zone.getCardReference()!;

            battleAction.startSelection({
              zones, onSelectionCompleted(zone) {
                const attackedCard = zone.getCardReference()!;
                duel.gameActions.attack({
                  attackingId: attackingCard.id,
                  attackingZone: g.zone.zone,
                  attackedId: attackedCard.id,
                  attackedZone: zone.zone
                })
              }
            });
          }
        });
      } else {
        this.attackObjects.values().forEach(g => {
          g.gameObject.visible = false;
          g.isUiElementClick = false;
        });
      }
    })
    //     const allZones = getAllGameCardZones(duel);
    //     allZones.forEach(zone => {
    //       const availableZoneToAttack = zone.hasCard() && zone.player === turnPlayer;

    //       if (availableZoneToAttack) {

    //       }
    //     });
    //   })
    //   const allZones = getAllGameCardZones(duel);
    //   if (phase === YGODuelPhase.Battle) {
    //     allZones.forEach(zone => {

    //       const availableZoneToAttack = zone.hasCard() && zone.player === turnPlayer;

    //       if (availableZoneToAttack) {
    //         zone.onClickCb = () => {
    //           alert("BATTLE");
    //         }
    //       } else {
    //         zone.onClickCb = () => {
    //           // NOTHIng
    //         }
    //       }
    //     });
    //   } else {
    //     allZones.forEach(zone => {
    //       zone.onClickCb = null;
    //     });
    //   }
    // })
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
  // isUiElementHover ?: boolean;
  // isUiCardElement ?: boolean;



  duel.core.scene.add(triangle);
  duel.gameController.getComponent<YGOMouseEvents>("mouse_events")?.registerElement(uielement);

  return uielement;
}