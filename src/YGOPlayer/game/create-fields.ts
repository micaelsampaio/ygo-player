import * as THREE from "three";
import { FieldZone, YGOGameUtils } from "ygo-core";
import type { YGODuel } from "../core/YGODuel";
import { YGOMath } from "../core/YGOMath";
import { Banish } from "./Banish";
import { CardZone } from "./CardZone";
import { Deck } from "./Deck";
import { ExtraDeck } from "./ExtraDeck";
import { Graveyard } from "./Graveyard";
import { GameHand } from "./Hand";
import { PlayerField } from "./PlayerField";

/**
 * Builds both players' fields from the loaded field model: every zone mesh in
 * the model becomes a CardZone / pile object at that mesh's world position.
 */
type CreateFieldDto = {
  duel: YGODuel;
  fieldModel: THREE.Object3D;
};

export function createFields({ duel, fieldModel }: CreateFieldDto) {

  const playerIndex = duel.perspective.playerIndex;

  fieldModel.rotation.copy(YGOMath.degToRadEuler(90, 0, 0));
  fieldModel.position.set(0, 0, 0);

  const zones: Record<string, THREE.Mesh> = {};
  const fieldModelP2 = fieldModel.clone();

  fieldModelP2.children.forEach((child) =>
    parseFieldZoneChildren(child, 1 - duel.perspective.playerPOV, zones)
  );

  fieldModel.children.forEach((child) =>
    parseFieldZoneChildren(child, duel.perspective.playerPOV, zones)
  );

  fieldModel.name = "FIELD1";
  fieldModelP2.name = "FIELD2";

  fieldModelP2.rotateY(THREE.MathUtils.degToRad(180));

  duel.core.scene.add(fieldModel);
  duel.core.scene.add(fieldModelP2);

  const fields: PlayerField[] = [];

  for (let player = 0; player < 2; ++player) {
    const isPlayer = player === playerIndex;
    const showCards = !!(isPlayer || duel.config.options.showCards)
    const controlCards = !!(isPlayer || (showCards && duel.ygo.options.controlOpponentCards))
    //const controlCards = true;
    const field = new PlayerField();
    const playerSufix = player === 0 ? "" : "2";
    field.playerIndex = player;
    field.settings.showCards = showCards;
    field.settings.controlCards = controlCards;
    field.settings.backCardPath = duel.createCdnUrl("/images/card_back.png");

    for (let i = 0; i < 5; ++i) {
      const monsterZoneId = `M${playerSufix}-${i + 1}` as FieldZone;
      const spellZoneId = `S${playerSufix}-${i + 1}` as FieldZone;

      const monsterZone = createCardZone(
        duel,
        player,
        monsterZoneId,
        zones[monsterZoneId]
      );
      const spellZone = createCardZone(
        duel,
        player,
        spellZoneId,
        zones[spellZoneId]
      );

      field.monsterZone.push(monsterZone);
      field.spellTrapZone.push(spellZone);
    }

    const mainDeckZone = YGOGameUtils.createZone("D", player);
    const extraDeckZone = YGOGameUtils.createZone("ED", player);
    const gyZone = YGOGameUtils.createZone("GY", player);
    const banishZone = YGOGameUtils.createZone("B", player);

    const mainDeckPosition = zones[mainDeckZone].getWorldPosition(
      new THREE.Vector3()
    );
    const extraDeckPosition = zones[extraDeckZone].getWorldPosition(
      new THREE.Vector3()
    );
    const gyPosition = zones[gyZone].getWorldPosition(new THREE.Vector3());
    const banishPosition = zones[banishZone].getWorldPosition(
      new THREE.Vector3()
    );

    field.mainDeck = new Deck({
      duel,
      player,
      zone: mainDeckZone,
      position: mainDeckPosition,
      backCardPath: field.settings.backCardPath
    });
    field.extraDeck = new ExtraDeck({
      duel,
      player,
      zone: extraDeckZone,
      position: extraDeckPosition,
      backCardPath: field.settings.backCardPath
    });
    field.graveyard = new Graveyard({
      duel,
      player,
      zone: gyZone,
      position: gyPosition,
    });
    field.banishedZone = new Banish({
      duel,
      player,
      zone: banishZone,
      position: banishPosition,
    });

    const fieldZoneId: FieldZone = YGOGameUtils.createZone("F", player);
    field.fieldZone = createCardZone(
      duel,
      player,
      fieldZoneId,
      zones[fieldZoneId]
    );
    field.hand = new GameHand(duel, player);
    field.hand.showHand = field.settings.showCards;

    field.mainDeck.canInteract = controlCards;
    field.extraDeck.canInteract = controlCards;

    fields.push(field);
  }

  for (let i = 0; i < 2; ++i) {
    const extraMonsterZoneId = `EMZ-${i + 1}` as FieldZone;
    const extraMonsterZone = createCardZone(
      duel,
      0,
      extraMonsterZoneId,
      zones[extraMonsterZoneId]
    );
    fields[0].extraMonsterZone.push(extraMonsterZone);
    fields[1].extraMonsterZone.push(extraMonsterZone);
  }

  return fields;
}

function createCardZone(
  duel: YGODuel,
  player: number,
  zone: FieldZone,
  zoneObject: THREE.Mesh
): CardZone {
  const cardZone = new CardZone({
    duel,
    zone,
    player,
    position: zoneObject.getWorldPosition(new THREE.Vector3()),
    rotation:
      duel.perspective.isPlayerPOV(player)
        ? YGOMath.degToRadEuler(0, 0, 0)
        : YGOMath.degToRadEuler(0, 0, 180),
  });

  return cardZone;
}

function parseFieldZoneChildren(object: THREE.Object3D, player: number, zones: Record<string, THREE.Mesh>) {
  const child = object as THREE.Mesh;
  if (child.isMesh) {
    const position = child.getWorldPosition(new THREE.Vector3());
    position.z += 0.05;

    // PUT THIS TRUE IF YOU WANT TO SEE THE MODELS
    child.visible = false;

    // child.material = new THREE.MeshBasicMaterial({
    //     color: 0x0000ff,
    //     transparent: true,
    //     opacity: 0.2,
    //     side: THREE.DoubleSide // Make the material double-sided
    // });

    const zoneData = YGOGameUtils.getZoneData(child.name as FieldZone);
    const zoneName = YGOGameUtils.createZone(
      zoneData.zone,
      player,
      zoneData.zoneIndex
    );
    zones[zoneName] = child;
  }
}
