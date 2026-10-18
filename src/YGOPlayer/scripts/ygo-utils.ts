import * as THREE from "three";
import type { YGODuel } from "../core/YGODuel";
import type { CardZone } from "../game/CardZone";
import { Card, FieldZone } from "ygo-core";
import { YGOGameUtils } from "ygo-core";
import { allowedExtraMonsterZones } from "./extra-monster-zones";

export { createFields } from "../game/create-fields";
export {
  getCardRotation,
  getCardRotationFromFieldZoneData,
  getCardRotationFromPlayerIndex,
  getZonePosition,
  getZonePositionFromZoneData,
  isFieldZone,
  getGameZone,
  isCardTransformFlipDown,
} from "../game/zone-transforms";

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
        case "EMZ": {
          // One EMZ per player (a second only through a Link Arrow); the
          // pair is shared, so never the one the opponent holds.
          const allowed = allowedExtraMonsterZones(duel.ygo.state.fields, player);
          zonesToFind = duel.fields[player].extraMonsterZone.filter(
            (zone, i) => allowed.includes((i + 1) as 1 | 2)
          );
          zonesToFind.forEach((zone) => {
            zone.zone = `EMZ${player === 0 ? "" : "2"}-${zone.zoneData.zoneIndex}` as FieldZone;
            zone.zoneData.player = player;
          });
          break;
        }
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

export function getTransformFromCamera(
  duel: YGODuel,
  gameObject: THREE.Object3D
): { x: number; y: number; width: number; height: number } {
  // Card and zone meshes are planes or boxes, whose geometry keeps its own size.
  const { width, height } = (gameObject as THREE.Mesh<THREE.PlaneGeometry | THREE.BoxGeometry>).geometry.parameters;

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

export function getScreenPositionFromWorld(
  duel: YGODuel,
  worldPosition: THREE.Vector3
): { x: number; y: number } {
  const canvas = duel.core.renderer.domElement;

  const projected = worldPosition.clone();
  projected.project(duel.core.camera);

  const halfWidth = canvas.width / 2;
  const halfHeight = canvas.height / 2;

  return {
    x: projected.x * halfWidth + halfWidth,
    y: -projected.y * halfHeight + halfHeight,
  };
}


export function getCardPositionInFrontOfCamera({ duel, distance = 4 }: { duel: YGODuel, distance?: number }) {
  const camera = duel.core.camera;
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  const startPosition = camera.position.clone().add(direction.multiplyScalar(distance));

  return startPosition;
}

export function randomIntFromInterval(min: number, max: number): number { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export interface YGOBattleInfo {
  attacking: {
    destroyed: boolean
  },
  attacked: {
    destroyed: boolean
  },
  battleDamage: number
}
export function calculateBattleInfo(attackingCard: Card, attackedCard: Card): YGOBattleInfo {
  const isAtk1 = !YGOGameUtils.isDefense(attackingCard);
  const isAtk2 = !YGOGameUtils.isDefense(attackedCard);

  const attackPower = isAtk1 ? attackingCard.currentAtk : attackingCard.currentDef;
  const defendPower = isAtk2 ? attackedCard.currentAtk : attackedCard.currentDef;

  let attackingDestroyed = false;
  let attackedDestroyed = false;

  let battleDamage = attackPower - defendPower
  attackingDestroyed = isAtk2 && attackPower > 0 && battleDamage < 0;
  attackedDestroyed = battleDamage > 0;

  if (!isAtk2 && battleDamage > 0) battleDamage = 0;

  return {
    attacking: {
      destroyed: attackingDestroyed,
    },
    attacked: {
      destroyed: attackedDestroyed,
    },
    battleDamage,
  };
}
export function fisherYatesShuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}
const DEFAULT_OFFSET_POSITION_VEC = new THREE.Vector3(1.5, 0, 0.2);

export function createOffsetPositionInMultipleEvents(
  duel: YGODuel,
  player: number,
  cardIndex: number | undefined,
  endPosition: THREE.Vector3,
  offset: THREE.Vector3 = DEFAULT_OFFSET_POSITION_VEC
): THREE.Vector3 {
  const newPosition = endPosition.clone();
  const isPOV = duel.perspective.isPlayerPOV(player);
  const offsetPlayer = isPOV ? 1 : -1;

  if (typeof cardIndex === "number" && cardIndex > 0) {
    newPosition.x -= cardIndex * offset.x * offsetPlayer;
    newPosition.z += cardIndex * offset.z;
    newPosition.y += cardIndex * offset.y;
  }

  return newPosition;
}
