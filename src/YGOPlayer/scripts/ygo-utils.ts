import * as THREE from "three";
import { YGODuel } from "../core/YGODuel";
import { YGOMath } from "../core/YGOMath";
import { PlayerField } from "../game/PlayerField";
import { CardZone } from "../game/CardZone";
import { GameHand } from "../game/Hand";
import { Deck } from "../game/Deck";
import { Graveyard } from "../game/Graveyard";
import { ExtraDeck } from "../game/ExtraDeck";
import { Card, FieldZone, FieldZoneData, YGOReplayData } from "ygo-core";
import { YGOGameUtils } from "ygo-core";
import { Banish } from "../game/Banish";

type CreateFieldDto = {
  duel: YGODuel;
  fieldModel: THREE.Scene;
};

export function createFields({ duel, fieldModel }: CreateFieldDto) {
  fieldModel.rotation.copy(YGOMath.degToRadEuler(90, 0, 0));
  fieldModel.position.set(0, 0, 0);

  const zones: { [key: string]: THREE.Mesh } = {};
  const fieldModelP2 = fieldModel.clone();
  fieldModelP2.rotateY(THREE.MathUtils.degToRad(180));

  fieldModelP2.children.forEach((child: any) =>
    parseFieldZoneChildren(child, 1, zones)
  );
  fieldModel.children.forEach((child: any) =>
    parseFieldZoneChildren(child, 0, zones)
  );

  fieldModel.name = "FIELD1";
  fieldModelP2.name = "FIELD2";

  duel.core.scene.add(fieldModel);
  duel.core.scene.add(fieldModelP2);

  const fields: PlayerField[] = [];

  for (let player = 0; player < 2; ++player) {
    const field = new PlayerField();
    const playerSufix = player === 0 ? "" : "2";

    for (let i = 0; i < 5; ++i) {
      const monsterZoneId: any = `M${playerSufix}-${i + 1}`;
      const spellZoneId: any = `S${playerSufix}-${i + 1}`;

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
    });
    field.extraDeck = new ExtraDeck({
      duel,
      player,
      zone: extraDeckZone,
      position: extraDeckPosition,
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

    fields.push(field);
  }

  for (let i = 0; i < 2; ++i) {
    const extraMonsterZoneGlobalId: any = `EMZ-${i + 1}`;
    const extraMonsterZoneId: any = `EMZ-${i + 1}`;
    const extraMonsterZone = createCardZone(
      duel,
      0,
      extraMonsterZoneId,
      zones[extraMonsterZoneGlobalId]
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
      player === 0
        ? YGOMath.degToRadEuler(0, 0, 0)
        : YGOMath.degToRadEuler(0, 0, 180),
  });

  return cardZone;
}

export function getMonstersZones(duel: YGODuel, players: number[]): CardZone[] {
  const result: CardZone[] = [];

  players.forEach((player) => {
    duel.fields[player].monsterZone.forEach((zone) => {
      if (zone.hasCard()) result.push(zone);
    });

    duel.fields[player].extraMonsterZone.forEach((zone) => {
      if (zone.hasCard() && zone.getCardReference()?.originalOwner === player)
        result.push(zone);
    });
  });

  return result;
}

export function getXyzMonstersZones(
  duel: YGODuel,
  players: number[]
): CardZone[] {
  const result: CardZone[] = [];

  players.forEach((player) => {
    duel.fields[player].monsterZone.forEach((zone) => {
      if (zone.hasCard() && YGOGameUtils.isXYZMonster(zone.getCardReference()!))
        result.push(zone);
    });

    duel.fields[player].extraMonsterZone.forEach((zone) => {
      if (
        zone.hasCard() &&
        YGOGameUtils.isXYZMonster(zone.getCardReference()!) &&
        zone.getCardReference()?.originalOwner === player
      )
        result.push(zone);
    });
  });

  return result;
}

export function getCardZones(
  duel: YGODuel,
  players: number[],
  zones: ("M" | "S" | "F" | "EMZ")[]
): CardZone[] {
  const result: CardZone[] = [];

  players.forEach((player) => {
    zones.forEach((zone) => {
      let zonesToFind: CardZone[] | undefined;

      switch (zone) {
        case "M":
          zonesToFind = duel.fields[player].monsterZone;
          break;
        case "S":
          zonesToFind = duel.fields[player].spellTrapZone;
          break;
        case "EMZ":
          zonesToFind = duel.fields[player].extraMonsterZone.filter(
            (zone) =>
              zone.isEmpty() ||
              zone.getCardReference()?.originalOwner === player
          );
          zonesToFind.forEach((zone) => {
            zone.zone = `EMZ${player === 0 ? "" : "2"}-${zone.zoneData.zoneIndex
              }` as any;
            zone.zoneData.player = player;
          });
          break;
        case "F":
          if (duel.fields[player].fieldZone.isEmpty()) {
            result.push(duel.fields[player].fieldZone);
          }
          break;
      }

      if (zonesToFind) {
        zonesToFind.forEach((zone) => {
          if (zone.isEmpty()) {
            result.push(zone);
          }
        });
      }
    });
  });

  return result;
}

export function cancelMouseEventsCallback(e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export function getCardRotation(duel: YGODuel, card: Card, zone: FieldZone) {
  const zoneData = YGOGameUtils.getZoneData(zone);
  return getCardRotationFromFieldZoneData(duel, card, zoneData);
}

export function getCardRotationFromFieldZoneData(
  duel: YGODuel,
  card: Card,
  zoneData: FieldZoneData
) {
  let rotation: THREE.Euler = new THREE.Euler(0, 0, 0);
  const field = duel.fields[zoneData.player];

  if (zoneData.zone === "GY" || zoneData.zone === "H") {
    // GY do nothig let go as default rotation
  } else if (zoneData.zone === "ED") {
    rotation = field.extraDeck.getCardTransform().rotation;
  } else if (zoneData.zone === "D") {
    rotation = field.mainDeck.getCardTransform().rotation;
  } else if (zoneData.zone === "B") {
    if (YGOGameUtils.isFaceDown(card)) {
      rotation.y = THREE.MathUtils.degToRad(-180);
    }
    rotation.z = THREE.MathUtils.degToRad(90);
  } else if (zoneData.zone === "S") {
    if (YGOGameUtils.isFaceDown(card)) {
      rotation.y = THREE.MathUtils.degToRad(180);
    }
  } else if (zoneData.zone === "F") {
    if (YGOGameUtils.isFaceDown(card)) {
      rotation.y = THREE.MathUtils.degToRad(180);
    }
  } else {
    // monster or extra monster zone
    if (!YGOGameUtils.isLinkMonster(card)) {
      // TODO FIX DEF NOT WORKING
      if (YGOGameUtils.isFaceDown(card)) {
        rotation.y = THREE.MathUtils.degToRad(180);
        if (YGOGameUtils.isDefense(card)) {
          rotation.z = THREE.MathUtils.degToRad(-90);
        }
      } else {
        if (YGOGameUtils.isDefense(card)) {
          rotation.z = THREE.MathUtils.degToRad(90);
        }
      }
    }
  }

  rotation = rotation.clone();

  if (
    zoneData.zone !== "D" &&
    zoneData.zone !== "ED" &&
    zoneData.player === 1
  ) {
    rotation.z += THREE.MathUtils.degToRad(180);
  }

  return rotation;
}

export function getCardRotationFromPlayerIndex(
  player: number
) {
  let rotation: THREE.Euler = new THREE.Euler(0, 0, 0);

  if (player === 1) {
    rotation.z += THREE.MathUtils.degToRad(180);
  }

  return rotation;
}

export function getZonePosition(duel: YGODuel, zone: FieldZone) {
  const zoneData = YGOGameUtils.getZoneData(zone);
  return getZonePositionFromZoneData(duel, zoneData);
}

export function getZonePositionFromZoneData(
  duel: YGODuel,
  zoneData: FieldZoneData
) {
  let position: THREE.Vector3;
  const zoneIndex = zoneData.zoneIndex! - 1;
  const field = duel.fields[zoneData.player];

  if (zoneData.zone === "M") {
    position = field.monsterZone[zoneIndex].position;
  } else if (zoneData.zone === "S") {
    position = field.spellTrapZone[zoneIndex].position;
  } else if (zoneData.zone === "H") {
    const cardInHand = field.hand.getCard(zoneIndex);
    position = cardInHand
      ? cardInHand.gameObject.position
      : field.monsterZone[0].position;
  } else if (zoneData.zone === "EMZ") {
    position = field.extraMonsterZone[zoneIndex].position;
  } else if (zoneData.zone === "GY") {
    position = field.graveyard.cardPosition;
  } else if (zoneData.zone === "B") {
    position = field.banishedZone.cardPosition;
  } else if (zoneData.zone === "D") {
    position = field.mainDeck.getCardTransform().position;
  } else if (zoneData.zone === "ED") {
    position = field.extraDeck.getCardTransform().position;
  } else if (zoneData.zone === "F") {
    position = field.fieldZone.gameObject.position;
  } else {
    position = field.monsterZone[0].position;
  }

  return position.clone();
}

const FIELD_ZONES = ["M", "S", "F", "EMZ", "ORU", "ORUEMZ"];
export function isFieldZone(zoneData: FieldZoneData) {
  return FIELD_ZONES.includes(zoneData.zone);
}

export function getGameZone(
  duel: YGODuel,
  zoneData: FieldZoneData
): CardZone | null {
  const field = duel.fields[zoneData.player];

  if (isFieldZone(zoneData)) {
    switch (zoneData.zone) {
      case "F":
        return field.fieldZone;
      case "S":
        return field.spellTrapZone[zoneData.zoneIndex - 1];
      case "EMZ":
      case "ORUEMZ":
        return field.extraMonsterZone[zoneData.zoneIndex - 1];
      default:
        return field.monsterZone[zoneData.zoneIndex - 1];
    }
  }

  return null;
}

export function getTransformFromCamera(
  duel: YGODuel,
  gameObject: any
): { x: number; y: number; width: number; height: number } {
  const width = gameObject.geometry.parameters.width;
  const height = gameObject.geometry.parameters.height;

  const corners = [
    new THREE.Vector3(-width / 2, -height / 2, 0), // bottom-left
    new THREE.Vector3(width / 2, -height / 2, 0), // bottom-right
    new THREE.Vector3(-width / 2, height / 2, 0), // top-left
    new THREE.Vector3(width / 2, height / 2, 0), // top-right
  ];

  const screenCorners = corners.map((corner) => {
    corner.applyMatrix4(gameObject.matrixWorld);
    corner.project(duel.camera);
    return corner;
  });

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  screenCorners.forEach((corner) => {
    minX = Math.min(minX, corner.x);
    minY = Math.min(minY, corner.y);
    maxX = Math.max(maxX, corner.x);
    maxY = Math.max(maxY, corner.y);
  });

  const canvas = duel.core.renderer.domElement;
  const halfWidth = canvas.width / 2;
  const halfHeight = canvas.height / 2;

  const screenWidth = (maxX - minX) * halfWidth;
  const screenHeight = (maxY - minY) * halfHeight;

  const vector = gameObject.getWorldPosition(new THREE.Vector3());
  vector.project(duel.core.camera);

  const screenX = vector.x * halfWidth + halfWidth;
  const screenY = -vector.y * halfHeight + halfHeight;

  return {
    x: screenX - screenWidth / 2,
    y: screenY - screenHeight / 2,
    width: screenWidth,
    height: screenHeight,
  };
}

export function replayToYGOProps(
  playersData: { mainDeck: Card[]; extraDeck: Card[] }[],
  replay: YGOReplayData
) {
  const players = replay.players.map((player, playerIndex) => {
    const { mainDeck: mainDeckProps, extraDeck: extraDeckProps } =
      playersData[playerIndex];
    const mainDeck = player.mainDeck.map((id) => {
      const card = mainDeckProps.find((c) => c.id === id);
      if (!card) throw new Error(`card "${id}" not found in main deck`);
      return card;
    });
    const extraDeck = player.extraDeck.map((id) => {
      const card = extraDeckProps.find((c) => c.id === id);
      if (!card) throw new Error(`card "${id}" not found in extra deck`);
      return card;
    });

    return {
      name: player.name,
      mainDeck,
      extraDeck,
    };
  });
  return {
    players,
    commands: replay.commands,
    options: {
      fieldState: replay.initialField ? replay.initialField : undefined,
      shuffleDecks: false,
    },
  };
}

function parseFieldZoneChildren(child: THREE.Mesh, player: number, zones: any) {
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

    const zoneData = YGOGameUtils.getZoneData(child.name as any);
    const zoneName = YGOGameUtils.createZone(
      zoneData.zone,
      player,
      zoneData.zoneIndex
    );
    zones[zoneName] = child;
  }
}

export function getCardPositionInFrontOfCamera({ camera, distance = 4 }: { camera: THREE.Camera, distance?: number }) {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  const startPosition = camera.position.clone().add(direction.multiplyScalar(distance));

  return startPosition;
}