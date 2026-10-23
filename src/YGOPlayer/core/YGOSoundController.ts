import { YGOAudioClip, YGOAudioLayer } from "../types";
import { YGOComponent } from "./YGOComponent";
import { YGOPlayerLogger } from "./YGOPlayerLogger";
import { SFX_GAIN, SfxBufferCache, SfxName } from "./sfx/battle-sfx";

type AudioContextCtor = new () => AudioContext;

export class YGOSoundController extends YGOComponent {
    private sounds: Map<string, YGOAudioClip[]>;
    private layers: YGOAudioLayer[];
    private timeScale: number;
    /** Lazily created on the first synthesized effect; null when Web Audio is unavailable. */
    private audioContext: AudioContext | null | undefined;
    private sfxBuffers = new SfxBufferCache();

    constructor(private logger: YGOPlayerLogger = new YGOPlayerLogger()) {
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
    }): YGOAudioClip | null {
        const audioClip = this.getSound(key);

        if (!audioClip) {
            this.logger.warn("YGOSoundController", `Sound ${key} could not be loaded.`);
            return null;
        }

        const audio = audioClip.element;
        audio.volume = volume;
        audio.loop = loop;

        const targetLayer = layer ? this.layers.find(l => l.name === layer) : this.layers[0];
        if (!targetLayer) {
            this.logger.warn("YGOSoundController", `Layer "${layer}" not found.`);
            return null;
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

        audio.play().catch(() => {
            instance.playing = false;
            targetLayer.sounds = targetLayer.sounds.filter(s => s !== instance);
            audio.onended = null;
            onComplete?.();
        });

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

    /**
     * The shared AudioContext for synthesized effects, created on first use.
     * Null where Web Audio is missing (jsdom, very old browsers).
     */
    public getAudioContext(): AudioContext | null {
        if (this.audioContext !== undefined) return this.audioContext;
        const g = globalThis as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
        const Ctor = g.AudioContext ?? g.webkitAudioContext;
        try {
            this.audioContext = Ctor ? new Ctor() : null;
        } catch {
            this.audioContext = null;
        }
        return this.audioContext;
    }

    /**
     * Plays a procedurally synthesized effect (core/sfx/battle-sfx.ts) on a
     * layer ("GAME" by default), honoring that layer's volume (0 = muted) and,
     * on a time-scaled layer, the game speed (the effect is rendered shorter,
     * not pitched up). Returns false when nothing was played.
     */
    public playSfx(name: SfxName, { layer = "GAME", volume = 1 }: { layer?: string; volume?: number } = {}): boolean {
        const targetLayer = this.layers.find(l => l.name === layer);
        if (!targetLayer || !targetLayer.enabled) return false;
        const gain = volume * SFX_GAIN[name] * targetLayer.volume;
        if (!(gain > 0)) return false;

        const ctx = this.getAudioContext();
        if (!ctx) return false;
        // Autoplay policy: a context made before a user gesture starts suspended.
        if (ctx.state === "suspended") ctx.resume().catch(() => { });

        try {
            const speed = targetLayer.useTimeScale ? this.timeScale : 1;
            const source = ctx.createBufferSource();
            source.buffer = this.sfxBuffers.get(ctx, name, speed);
            const gainNode = ctx.createGain();
            gainNode.gain.value = gain;
            source.connect(gainNode).connect(ctx.destination);
            source.onended = () => {
                source.disconnect();
                gainNode.disconnect();
            };
            source.start();
            return true;
        } catch (error) {
            this.logger.warn("YGOSoundController", `Sfx ${name} could not be played.`, error);
            return false;
        }
    }

    public async loadSound(path: string) {
        if (this.sounds.has(path)) return;

        const audio = new Audio(path);
        await new Promise<void>((resolve, reject) => {
            // Backgrounded/hidden tabs can throttle media buffering indefinitely
            // (canplaythrough never fires), which would otherwise hang duel load forever.
            const timeout = setTimeout(() => resolve(), 5000);
            audio.oncanplaythrough = () => { clearTimeout(timeout); resolve(); };
            audio.onerror = () => { clearTimeout(timeout); reject(new Error(`Failed to load sound: ${path}`)); };
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

    public onDestroy(): void {
        this.layers.forEach(layer => {
            layer.sounds.forEach(sound => {
                sound.element.pause();
                sound.element.src = '';
                sound.element.remove();
            })
        });
        this.sounds.clear();
        this.sfxBuffers.clear();
        this.audioContext?.close().catch(() => { });
        this.audioContext = null;
    }
}
