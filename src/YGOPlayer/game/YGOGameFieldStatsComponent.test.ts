import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import type { Card } from "ygo-core";
import { YGOGameFieldStatsComponent } from "./YGOGameFieldStatsComponent";
import type { YGODuel } from "../core/YGODuel";

function fakeCanvas() {
  const ctx = new Proxy({}, {
    get: (_target, key) => (key === "measureText" ? () => ({ width: 10 }) : () => undefined),
    set: () => true,
  });
  return { width: 0, height: 0, getContext: () => ctx };
}

function card(url: string): Card {
  return { images: { small_url: url } } as unknown as Card;
}

function makeDuel() {
  const graveyard: Card[] = [];
  // Both players read the same mocked field, so each url is requested once per player.
  const pending = new Map<string, ((texture: THREE.Texture) => void)[]>();
  const loadTexture = vi.fn((url: string) => new Promise<THREE.Texture>(resolve => {
    pending.set(url, [...(pending.get(url) ?? []), resolve]);
  }));
  const resolvers = {
    get: (url: string) => (texture: THREE.Texture) => pending.get(url)?.forEach(resolve => resolve(texture)),
  };
  const scene = new THREE.Scene();
  const zone = (x = 0) => ({ position: new THREE.Vector3(x, 0, 0), gameObject: { position: new THREE.Vector3() } });
  // The graveyard sits at x = 1 so its counter can be told apart from the banished one.
  const playerField = () => ({ graveyard: zone(1), banishedZone: zone(2), mainDeck: zone(), extraDeck: zone() });
  const field = { hand: [], mainDeck: [], extraDeck: [], graveyard, banishedZone: [], stats: { normalSummons: 0, specialSummons: 0, fieldAtk: 0 } };
  const duel = {
    core: { scene },
    config: { cdnUrl: "" },
    assets: { getImage: () => ({}), loadTexture },
    perspective: { isPlayerPOV: (player: number) => player === 0 },
    fields: [playerField(), playerField()],
    ygo: { getField: () => field },
    logger: { swallowed: vi.fn() },
  };
  return { duel: duel as unknown as YGODuel, graveyard, loadTexture, resolvers, scene };
}

/** The graveyard counters' card planes (card-sized 1.5 x 2.25 planes in the group at x = 1). */
function graveyardCardMaterials(scene: THREE.Scene) {
  const found: THREE.MeshBasicMaterial[] = [];
  scene.traverse(object => {
    const mesh = object as THREE.Mesh;
    const isCardPlane = mesh.isMesh && (mesh.geometry as THREE.PlaneGeometry).parameters?.height === 2.25;
    if (isCardPlane && mesh.parent?.position.x === 1) {
      found.push(mesh.material as THREE.MeshBasicMaterial);
    }
  });
  return found;
}

describe("YGOGameFieldStatsComponent card counters", () => {
  beforeEach(() => {
    vi.stubGlobal("document", { createElement: () => fakeCanvas() });
    vi.stubGlobal("window", { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the top graveyard card through the shared asset cache", async () => {
    const { duel, graveyard, loadTexture, resolvers, scene } = makeDuel();
    const stats = new YGOGameFieldStatsComponent(duel);

    graveyard.push(card("a.jpg"));
    stats.update();
    stats.update(); // unchanged top card: no second request

    expect(loadTexture).toHaveBeenCalledTimes(2); // one per player, both see the same mocked field
    expect(loadTexture).toHaveBeenCalledWith("a.jpg");

    const texture = new THREE.Texture();
    resolvers.get("a.jpg")!(texture);
    await Promise.resolve();

    expect(graveyardCardMaterials(scene)).toHaveLength(2);
    for (const material of graveyardCardMaterials(scene)) {
      expect(material.map).toBe(texture);
      expect(material.opacity).toBe(1);
    }
  });

  it("ignores a load that finishes after a newer top card replaced it", async () => {
    const { duel, graveyard, resolvers, scene } = makeDuel();
    const stats = new YGOGameFieldStatsComponent(duel);

    graveyard.push(card("old.jpg"));
    stats.update();
    graveyard.push(card("new.jpg"));
    stats.update();

    const newTexture = new THREE.Texture();
    resolvers.get("new.jpg")!(newTexture);
    resolvers.get("old.jpg")!(new THREE.Texture());
    await Promise.resolve();

    for (const material of graveyardCardMaterials(scene)) {
      expect(material.map).toBe(newTexture);
    }
  });

  it("frees its own canvas textures on destroy but never the cached card texture", async () => {
    const { duel, graveyard, resolvers, scene } = makeDuel();
    const stats = new YGOGameFieldStatsComponent(duel);
    graveyard.push(card("a.jpg"));
    stats.update();

    const cached = new THREE.Texture();
    const cachedDispose = vi.spyOn(cached, "dispose");
    resolvers.get("a.jpg")!(cached);
    await Promise.resolve();

    const canvasTextures: THREE.Texture[] = [];
    scene.traverse(object => {
      const map = ((object as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined)?.map;
      if (map && map !== cached) canvasTextures.push(map);
    });
    const canvasDisposes = canvasTextures.map(texture => vi.spyOn(texture, "dispose"));
    expect(canvasDisposes.length).toBeGreaterThan(0);

    stats.destroy();

    canvasDisposes.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
    expect(cachedDispose).not.toHaveBeenCalled();
    expect(scene.children).toHaveLength(0);
  });
});
