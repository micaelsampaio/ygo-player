import { afterEach, describe, expect, it, vi } from "vitest";
import { YGOSoundController } from "./YGOSoundController";
import { YGOPlayerLogger } from "./YGOPlayerLogger";

describe("YGOSoundController warnings", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("warns through the logger when the layer does not exist, without reaching onError", () => {
    vi.stubGlobal("Audio", class { volume = 1; loop = false; playbackRate = 1; });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
    const onError = vi.fn();
    const sounds = new YGOSoundController(new YGOPlayerLogger(onError));

    expect(sounds.playSound({ key: "a.mp3", layer: "MISSING" })).toBeNull();
    expect(warn).toHaveBeenCalledWith('YGOSoundController: Layer "MISSING" not found.');
    expect(onError).not.toHaveBeenCalled();
  });
});
