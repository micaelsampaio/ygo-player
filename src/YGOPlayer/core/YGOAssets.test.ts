import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { YGOAssets } from "./YGOAssets";
import type { YGODuel } from "./YGODuel";

type OnLoad = (texture: THREE.Texture) => void;
type OnError = (error: unknown) => void;

/** TextureLoader stand-in: returns a Texture right away and finishes when the test says so. */
function makeLoader() {
  const pending: { url: string; texture: THREE.Texture; onLoad: OnLoad; onError: OnError }[] = [];
  const load = vi.fn((url: string, onLoad: OnLoad, _onProgress: unknown, onError: OnError) => {
    const texture = new THREE.Texture();
    pending.push({ url, texture, onLoad, onError });
    return texture;
  });
  return { load, pending };
}

function makeAssets() {
  const loader = makeLoader();
  const duel = { core: { textureLoader: { load: loader.load } } } as unknown as YGODuel;
  return { assets: new YGOAssets(duel), loader };
}

describe("YGOAssets texture cache", () => {
  it("shares one Texture between requests made while it is still loading", () => {
    const { assets, loader } = makeAssets();

    const a = assets.getTexture("card.jpg");
    const b = assets.getTexture("card.jpg");

    expect(loader.load).toHaveBeenCalledTimes(1);
    expect(b).toBe(a);

    loader.pending[0].onLoad(a);
    expect(assets.getTexture("card.jpg")).toBe(a);
    expect(loader.load).toHaveBeenCalledTimes(1);
  });

  it("loadTexture joins an in-flight getTexture load and resolves with the same Texture", async () => {
    const { assets, loader } = makeAssets();
    const texture = assets.getTexture("card.jpg");

    const loaded = assets.loadTexture("card.jpg");
    loader.pending[0].onLoad(texture);

    await expect(loaded).resolves.toBe(texture);
    expect(loader.load).toHaveBeenCalledTimes(1);
    // Once loaded, later calls resolve straight from the cache.
    await expect(assets.loadTexture("card.jpg")).resolves.toBe(texture);
    expect(loader.load).toHaveBeenCalledTimes(1);
  });

  it("loadTextures de-duplicates repeated urls", async () => {
    const { assets, loader } = makeAssets();

    const all = assets.loadTextures(["a.jpg", "b.jpg", "a.jpg"]);
    expect(loader.load).toHaveBeenCalledTimes(2);
    loader.pending.forEach(p => p.onLoad(p.texture));

    await all;
    expect(assets.getTexture("a.jpg")).toBe(loader.pending[0].texture);
  });

  it("drops a failed load from the cache so the next request retries", async () => {
    const { assets, loader } = makeAssets();
    const first = assets.getTexture("missing.jpg");
    const loaded = assets.loadTexture("missing.jpg");

    loader.pending[0].onError(new Error("404"));

    await expect(loaded).rejects.toThrow("404");
    const retry = assets.getTexture("missing.jpg");
    expect(retry).not.toBe(first);
    expect(loader.load).toHaveBeenCalledTimes(2);
  });
});
