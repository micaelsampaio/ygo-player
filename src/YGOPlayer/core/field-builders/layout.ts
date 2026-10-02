/**
 * Where the zones really are (from field.glb, already placed on the board),
 * for the generated fields: every drawn zone lines up with the zone a card
 * lands in. World coordinates: the board lies in the XY plane, +Z toward the
 * camera, the viewer's side at negative Y.
 */
import * as THREE from "three";
import type { YGODuel } from "../YGODuel";
import { YGOEntity } from "../YGOEntity";
import { CARD_HEIGHT_SIZE, CARD_RATIO } from "../../constants";
import { globalUniforms } from "../YGOPlayerCore";

export type ZoneKind = "monster" | "spell" | "field" | "extraMonster" | "gy" | "banished" | "deck" | "extra";

export interface LaidZone {
  kind: ZoneKind;
  owner: number;
  center: THREE.Vector3;
  width: number;
  height: number;
}

export function zoneLayout(duel: YGODuel): LaidZone[] {
  const zones: LaidZone[] = [];
  const pileW = CARD_HEIGHT_SIZE / CARD_RATIO + 0.2;
  const pileH = CARD_HEIGHT_SIZE * 0.82;
  duel.fields.forEach((field, owner) => {
    if (!field) return;
    field.monsterZone.forEach((z) => zones.push({ kind: "monster", owner, center: z.position.clone(), width: z.size.x, height: z.size.y }));
    field.spellTrapZone.forEach((z) => zones.push({ kind: "spell", owner, center: z.position.clone(), width: z.size.x, height: z.size.y }));
    if (field.fieldZone) zones.push({ kind: "field", owner, center: field.fieldZone.position.clone(), width: field.fieldZone.size.x, height: field.fieldZone.size.y });
    const piles: Array<[ZoneKind, THREE.Vector3 | undefined]> = [
      ["gy", field.graveyard?.cardPosition],
      ["banished", field.banishedZone?.cardPosition],
      ["deck", field.mainDeck?.getCardTransform?.().position],
      ["extra", field.extraDeck?.getCardTransform?.().position],
    ];
    for (const [kind, pos] of piles) if (pos) zones.push({ kind, owner, center: new THREE.Vector3(pos.x, pos.y, 0), width: pileW, height: pileH });
  });
  (duel.fields[0]?.extraMonsterZone ?? []).forEach((z) => zones.push({ kind: "extraMonster", owner: -1, center: z.position.clone(), width: z.size.x, height: z.size.y }));
  return zones;
}

/** The rectangle every zone fits in, plus a margin. */
export function layoutBounds(zones: LaidZone[], margin = 1.2) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const z of zones) {
    minX = Math.min(minX, z.center.x - z.width / 2); maxX = Math.max(maxX, z.center.x + z.width / 2);
    minY = Math.min(minY, z.center.y - z.height / 2); maxY = Math.max(maxY, z.center.y + z.height / 2);
  }
  return { minX: minX - margin, maxX: maxX + margin, minY: minY - margin, maxY: maxY + margin, width: maxX - minX + 2 * margin, height: maxY - minY + 2 * margin, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

/** What a generated field hands the scene. */
export interface BuiltField {
  root: THREE.Object3D;
  /** One group per side (viewer's first), each with the "player_turn_field" glow and the GY/banished hover meshes. */
  sides: [THREE.Object3D, THREE.Object3D];
  /** Per-frame work (a torch's flicker); animation that only needs time runs in shaders. */
  update?: (dt: number) => void;
}

/** The turn-side glow plane and GY/banished hover highlights of one side, as the scene looks them up by name. */
export function sideGroup(zones: LaidZone[], owner: number, bounds: ReturnType<typeof layoutBounds>, viewer: number, opts: { turnGlow?: boolean } = {}): THREE.Group {
  const side = new THREE.Group();
  const mine = owner === viewer;
  if (opts.turnGlow === false) return addPileHovers(side, zones, owner);
  const turn = new THREE.Mesh(new THREE.PlaneGeometry(bounds.width, bounds.height / 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.2, depthWrite: false }));
  turn.name = "player_turn_field";
  turn.position.set(bounds.cx, mine ? bounds.cy - bounds.height / 4 : bounds.cy + bounds.height / 4, 0.01);
  // The glow shader fades along the plane's V: rotate the far side so it fades toward the middle too.
  if (!mine) turn.rotation.z = Math.PI;
  turn.renderOrder = -5;
  side.add(turn);
  return addPileHovers(side, zones, owner);
}

function addPileHovers(side: THREE.Group, zones: LaidZone[], owner: number): THREE.Group {
  for (const [kind, name] of [["gy", "GY_SELECTION_MESH"], ["banished", "B_SELECTION_MESH"]] as const) {
    const z = zones.find((q) => q.kind === kind && q.owner === owner);
    if (!z) continue;
    const hover = new THREE.Mesh(new THREE.PlaneGeometry(z.width + 0.4, z.height + 0.4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false }));
    hover.name = name;
    hover.position.set(z.center.x, z.center.y, 0.02);
    side.add(hover);
  }
  return side;
}

/** Runs a generated field's per-frame work as one of the duel's entities. */
export class FieldAnimator extends YGOEntity {
  constructor(private tick: (dt: number) => void) { super(); this.name = "field-animator"; }
  update(dt: number) { this.tick(dt); }
}

/** The shared shader clock (seconds), advanced by the renderer each frame. */
export const timeUniform = globalUniforms.time;
