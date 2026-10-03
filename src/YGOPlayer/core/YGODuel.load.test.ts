/* eslint-disable @typescript-eslint/no-explicit-any -- the duel's parts are hand-rolled stubs */
/**
 * Characterisation test for YGODuel.load (and createYGO's core-event wiring):
 * what it loads, in which order it builds the board and which settings it
 * listens to. Runs load() on a YGODuel prototype with stub parts.
 */
import { describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ log: [] as string[] }));
vi.mock("../scripts/ygo-utils", () => ({ createFields: () => { h.log.push("createFields"); return [{ id: "f0" }]; } }));
vi.mock("../game/YGOGameFieldStatsComponent", () => ({ YGOGameFieldStatsComponent: class { constructor() { h.log.push("new FieldStats"); } } }));
vi.mock("../actions/BattlePhaseController", () => ({ BattlePhaseController: class { constructor(name: string) { h.log.push(`new BattlePhaseController(${name})`); } } }));
vi.mock("./field-theme-scene", () => ({ recolorModel: () => h.log.push("recolorModel") }));

import { YGODuel } from "./YGODuel";

function stubDuel(themeId: string) {
  const log = h.log;
  const listeners: string[] = [];
  const duel: any = Object.create(YGODuel.prototype);
  Object.assign(duel, {
    config: { cdnUrl: "cdn" },
    settings: {
      getFieldTheme: () => themeId,
      events: { on: (name: string) => { listeners.push(name); log.push(`settings.on ${name}`); } },
    },
    assets: {
      models: new Map<string, any>(),
      loadGLTF: async (url: string) => { log.push(`loadGLTF ${url}`); duel.assets.models.set(url, { scene: { url } }); },
      loadImages: async (...urls: string[]) => { log.push(`loadImages ${urls.length}`); },
    },
    soundController: { loadSounds: async (...urls: string[]) => { log.push(`loadSounds ${urls.join(",")}`); } },
    loadingTask: { completeTask: () => log.push("loadingTask.complete"), wait: async () => log.push("loadingTask.wait") },
    entities: [],
    gameController: {
      getComponent: (name: string) => ({
        createCardSelections: () => log.push(`${name}.createCardSelections`),
        create: () => log.push(`${name}.create`),
      }),
      addComponent: (name: string) => log.push(`addComponent ${name}`),
    },
    duelScene: {
      createFields: ({ gameField, theme }: any) => log.push(`duelScene.createFields(${gameField ? gameField.url : null}, ${theme.id})`),
      createGameMusic: () => log.push("duelScene.createGameMusic"),
    },
    core: { updateCamera: () => log.push("core.updateCamera") },
    updateField: () => log.push("updateField"),
    serverActions: { server: { setClientReady: () => log.push("setClientReady") } },
    logger: { error: (...args: any[]) => log.push(`logger.error ${args[1]}`) },
  });
  return { duel, listeners };
}

describe("YGODuel.load", () => {
  it.each(["classic", "holo"])("loads assets and builds the board in order (%s)", async (themeId) => {
    h.log.length = 0;
    const { duel, listeners } = stubDuel(themeId);
    await duel.load();
    expect({ log: h.log, listeners, entities: duel.entities.length, fields: duel.fields }).toMatchSnapshot();
  });

  it("logs and stops when an asset fails", async () => {
    h.log.length = 0;
    const { duel } = stubDuel("classic");
    duel.assets.loadGLTF = async () => { throw new Error("boom"); };
    await duel.load();
    expect(h.log).toEqual(["loadImages 8", "loadSounds cdn/sounds/card-place-1.ogg,cdn/sounds/card-place-2.ogg,cdn/sounds/card-place-3.ogg", "logger.error load failed:"]);
  });
});
