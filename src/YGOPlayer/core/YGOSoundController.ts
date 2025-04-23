import { YGOAudioClip, YGOAudioLayer } from "../types";
import { YGOComponent } from "./YGOComponent";

export class YGOSoundController extends YGOComponent {
    private sounds: Map<string, YGOAudioClip[]>;
    private layers: YGOAudioLayer[];
    private timeScale: number;

    constructor() {
        super("audio_controller");
        this.sounds = new Map();
        this.layers = [];
        this.timeScale = 1;
    }

    public addLayer({
        name,
        volume = 1,
        useTimeScale = true,
    }: {
        name: string;
        volume?: number;
        useTimeScale?: boolean;
    }) {
        this.layers.push({
            enabled: true,
            name,
            sounds: [],
            useTimeScale,
            volume,
        });
    }

    public playSound({
        key,
        layer,
        volume = 1,
        loop = false,
        onComplete,
    }: {
        key: string;
        layer?: string;
        volume?: number;
        loop?: boolean;
        onComplete?: () => void;
    }): YGOAudioClip {
        const audioClip = this.getSound(key);

        if (!audioClip) {
            console.warn(`Sound ${key} could not be loaded.`);
            return null as any;
        }

        const audio = audioClip.element;
        audio.volume = volume;
        audio.loop = loop;

        const targetLayer = layer ? this.layers.find(l => l.name === layer) : this.layers[0];
        if (!targetLayer) {
            console.warn(`Layer "${layer}" not found.`);
            return null as any;
        }

        if (targetLayer.useTimeScale) {
            audio.playbackRate = this.timeScale;
        }

        const instance: YGOAudioClip = {
            key,
            playing: true,
            volume,
            loop,
            element: audio,
        };

        targetLayer.sounds.push(instance);

        audio.currentTime = 0;
        audio.volume = audio.volume * targetLayer.volume;

        try {
            audio.play();
        } catch (err) {
            console.error(`Error playing audio "${key}"`, err);
        }

        if (!loop) {
            audio.onended = () => {
                instance.playing = false;
                targetLayer.sounds = targetLayer.sounds.filter(s => s !== instance);
                audio.onended = null;
                onComplete?.();
            };
        }

        return instance;
    }

    public async loadSound(path: string) {
        if (this.sounds.has(path)) return;

        const audio = new Audio(path);
        await new Promise<void>((resolve, reject) => {
            audio.oncanplaythrough = () => resolve();
            audio.onerror = () => reject(new Error(`Failed to load sound: ${path}`));
        });

        const baseClip: YGOAudioClip = {
            key: path,
            playing: false,
            volume: 1,
            loop: false,
            element: audio,
        };

        this.sounds.set(path, [baseClip]);
    }

    public async loadSounds(...paths: string[]) {
        const loadPromises = paths.map(path =>
            this.loadSound(path).catch(err => ({ error: err, path }))
        );

        await Promise.allSettled(loadPromises);

        // results.forEach((result, i) => {
        //     const path = paths[i];
        //     if (result.status === "rejected" || (result.value as any)?.error) {
        //         console.warn(`❌ Sound failed to load: ${path}`, result.reason || (result.value as any)?.error);
        //     } else {
        //         console.log(`✅ Sound loaded: ${path}`);
        //     }
        // });
    }

    private getSound(key: string): YGOAudioClip {
        let list = this.sounds.get(key);

        if (!list || list.length === 0) {
            const audio = new Audio(key);

            const newClip: YGOAudioClip = {
                key,
                playing: false,
                volume: 1,
                loop: false,
                element: audio,
            };

            this.sounds.set(key, [newClip]);
            return newClip;
        }

        const available = list.find(clip => clip.element.paused || clip.element.ended || !clip.playing);
        if (available) return available;

        const base = list[0];
        const clonedElement = base.element.cloneNode(true) as HTMLAudioElement;

        const clonedClip: YGOAudioClip = {
            key,
            playing: false,
            volume: base.volume,
            loop: base.loop,
            element: clonedElement,
        };

        list.push(clonedClip);
        return clonedClip;
    }


    public setTimeScale(value: number) {
        this.timeScale = value;
        for (const layer of this.layers) {
            if (!layer.useTimeScale) continue;
            for (const sound of layer.sounds) {
                sound.element.playbackRate = value;
            }
        }
    }

    public setLayerVolume(layerName: string, volume: number) {

        const layer = this.layers.find(l => l.name === layerName);

        if (!layer) return;

        layer.volume = Math.max(0, Math.min(1, volume));

        for (const sound of layer.sounds) {
            sound.element.volume = sound.volume * layer.volume;
        }
    }
}
