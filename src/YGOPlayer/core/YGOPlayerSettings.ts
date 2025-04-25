import { EventBus } from "../scripts/event-bus"
import { deepMerge, getJsonFromLocalStorage, safeStringify } from "../scripts/utils"

export interface YGOPlayerSettings {
    musicVolume: number
    gameVolume: number
    showFaceDownCardsTransparent: boolean
}

export interface YGOPlayerSettingsAdapterOptions {
    autoSave?: boolean
}

export interface YGOPlayerSettingsEvents {
    onMusicVolumeChange: (oldValue: number, value: number) => void
    onGameVolumeChange: (oldValue: number, value: number) => void
    onShowFaceDownCardsTransparentChange: (oldValue: boolean, value: boolean) => void
    onSettingsChanged: () => void
}

const DEFAULT_SETTINGS: YGOPlayerSettings = {
    musicVolume: 1,
    gameVolume: 1,
    showFaceDownCardsTransparent: true
}

const YGO_SETTINGS_KEY = "ygo_player_settings";

export class YGOPlayerSettingsAdapter {
    private data: YGOPlayerSettings;
    private autoSave: boolean;
    public events: EventBus<YGOPlayerSettingsEvents>;

    constructor(options?: YGOPlayerSettingsAdapterOptions) {
        this.autoSave = typeof options?.autoSave !== "undefined" ? !!options?.autoSave : true;
        this.data = this.loadConfig();
        this.events = new EventBus();
    }

    loadConfig() {
        const userSettings = getJsonFromLocalStorage(YGO_SETTINGS_KEY);
        const settings = deepMerge<YGOPlayerSettings>(DEFAULT_SETTINGS, userSettings);
        return settings;
    }

    public getMusicVolume() {
        return this.data.musicVolume;
    }

    public setMusicVolume(value: number) {
        if (value !== this.data.musicVolume) {
            const oldValue = this.data.musicVolume;
            this.data.musicVolume = value;

            this.dispatchInternalSave();

            this.events.dispatch("onMusicVolumeChange", oldValue, value);
            this.events.dispatch("onSettingsChanged");
        }
    }

    public getGameVolume() {
        return this.data.gameVolume;
    }

    public setGameVolume(value: number) {
        if (value !== this.data.gameVolume) {
            const oldValue = this.data.gameVolume;
            this.data.gameVolume = value;

            this.dispatchInternalSave();

            this.events.dispatch("onGameVolumeChange", oldValue, value);
            this.events.dispatch("onSettingsChanged");
        }
    }

    public getShowFaceDownCardsTransparent() {
        return this.data.showFaceDownCardsTransparent;
    }

    public setShowFaceDownCardsTransparent(value: boolean) {
        if (value !== this.data.showFaceDownCardsTransparent) {
            const oldValue = this.data.showFaceDownCardsTransparent;
            this.data.showFaceDownCardsTransparent = value;

            this.dispatchInternalSave();

            this.events.dispatch("onShowFaceDownCardsTransparentChange", oldValue, value);
            this.events.dispatch("onSettingsChanged");
        }
    }

    private dispatchInternalSave() {
        if (this.autoSave) {
            this.save();
        }
    }

    public getStorageKey(): string {
        return YGO_SETTINGS_KEY;
    }

    public save() {
        const settingsAsString = safeStringify(this.data);
        window.localStorage.setItem(YGO_SETTINGS_KEY, settingsAsString);
    }
}