import * as THREE from "three";
import { Card, FieldZone, FieldZoneData, YGOGameUtils } from "ygo-core";
import type { YGODuel } from "../core/YGODuel";
import type { CardZone } from "./CardZone";

/**
 * Where a card sits and how it is turned in each zone of the field, from the
 * viewer's perspective. Only reads `duel.fields`, so the zone classes can use
 * it without depending on field construction.
 */
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

  if (zoneData.zone === "GY") {
    // GY do nothig let go as default rotation
  } else if (zoneData.zone === "H") {
    if (!field.settings.showCards && !duel.perspective.isPlayerPOV(zoneData.player)) {
      rotation.set(0, THREE.MathUtils.degToRad(180), 0);
    }
    // do nothig let go as default rotation
  } else if (zoneData.zone === "ED") {
    if (YGOGameUtils.isPendulumCard(card)) {
      rotation = new THREE.Euler(0, 0, THREE.MathUtils.degToRad(-15));
    } else {
      rotation = field.extraDeck.getCardTransform().rotation;
    }
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
    !duel.perspective.isPlayerPOV(zoneData.player)
  ) {
    rotation.z += THREE.MathUtils.degToRad(180);
  }

  return rotation;
}

export function getCardRotationFromPlayerIndex(
  duel: YGODuel,
  player: number
) {
  let rotation: THREE.Euler = new THREE.Euler(0, 0, 0);

  if (!duel.perspective.isPlayerPOV(player)) {
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
    position = field.extraDeck.getCardTransform().position.clone();
    position.z += 0.2;
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

export function isCardTransformFlipDown(obj: THREE.Object3D | null | undefined, tolerance = 10): boolean {
  if (!obj) return true;

  const yDeg = (obj.rotation.y * 180) / Math.PI;
  // Into [-180, 180): both 179° and -179° are within the tolerance of a half turn.
  const normalizedY = ((((yDeg + 180) % 360) + 360) % 360) - 180;

  return 180 - Math.abs(normalizedY) < tolerance;
}
