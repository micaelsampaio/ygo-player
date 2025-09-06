import * as THREE from 'three';
import { YGOComponent } from "../core/YGOComponent";
import { YGODuel } from "../core/YGODuel";
import { CardZone } from "../game/CardZone";
import { YGODuelPhase, YGOGameUtils } from 'ygo-core';
import { ActionAttackSelection } from './ActionAttackSelection';
import { BattlePhaseButton } from '../game/BattlePhaseButton';

export class BattlePhaseController extends YGOComponent {

  private attackButtons: Map<string, BattlePhaseButton>;

  constructor(name: string, private duel: YGODuel) {
    super(name);
    this.attackButtons = new Map();
    this.enabled = false;

    this.createAttackButtons();
    this.hideBattlePhaseIcons();
    this.bindEvents();
  }

  private bindEvents() {
    this.duel.ygo.events.on("set-duel-phase", ({ phase }) => {
      if (phase === YGODuelPhase.Battle) {
        this.enabled = true;
      } else {
        this.enabled = false;
        this.attackButtons.values().forEach(attackButton => attackButton.hide());
      }
    })

    this.duel.events.on("enable-game-actions", () => {
      if (this.enabled) {
        this.showBattlePhaseIcons(this.duel.ygo.state.turnPlayer);
      }
    });

    this.duel.events.on("disable-game-actions", () => {
      if (this.enabled) {
        this.hideBattlePhaseIcons();
      }
    });
  }

  private createAttackButtons() {
    this.duel.fields.forEach((player) => {
      player.monsterZone.forEach(zone => this.attackButtons.set(zone.zone, createAttackZone(this.duel, zone)));
    })
    const emz1 = createAttackZone(this.duel, this.duel.fields[0].extraMonsterZone[0]);
    this.attackButtons.set("EMZ-1", emz1);
    this.attackButtons.set("EMZ2-1", emz1);
    const emz2 = createAttackZone(this.duel, this.duel.fields[0].extraMonsterZone[1]);
    this.attackButtons.set("EMZ-2", emz2);
    this.attackButtons.set("EMZ2-2", emz2);
  }

  private hideBattlePhaseIcons() {
    this.attackButtons.values().forEach(button => button.hide());
  }

  private showBattlePhaseIcons(turnPlayer: number) {

    const rotation = turnPlayer === 1 ? new THREE.Euler(0, 0, THREE.MathUtils.degToRad(180)) : new THREE.Euler(0, 0, 0);

    this.attackButtons.values().forEach(attackButton => {
      const isVisible = attackButton.cardZone.hasCard() && attackButton.cardZone.zoneData.player === turnPlayer && YGOGameUtils.isFaceUp(attackButton.cardZone.getCardReference()!);
      if (!isVisible) {
        attackButton.hide();
        return;
      }

      attackButton.show();
      attackButton.rotation.copy(rotation);
      attackButton.gameObject.position.copy(attackButton.position);
      attackButton.gameObject.rotation.copy(attackButton.rotation);
      attackButton.onClickCb = () => {
        const battleAction = this.duel.gameController.getComponent<ActionAttackSelection>("attack_selection_action")
        const zones = battleAction.getMonstersZonesToAttack(attackButton.cardZone.zoneData.player);

        battleAction.startSelection({
          player: attackButton.cardZone.zoneData.player,
          cardZone: attackButton.cardZone,
          zones,
          directAttack: true,
        });
      }
    });
  }
}

function createAttackZone(duel: YGODuel, zone: CardZone): BattlePhaseButton {

  const attackButton = new BattlePhaseButton(duel);
  attackButton.cardZone = zone;
  attackButton.position = zone.position.clone();
  attackButton.rotation = zone.rotation.clone();
  attackButton.position.z += 0.25;
  attackButton.gameObject.position.copy(attackButton.position);

  return attackButton;
}
