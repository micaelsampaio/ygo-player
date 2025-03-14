import EventEmitter from 'events';

export interface AudioConfig {
    fftSize: number;
    minDecibels: number;
    maxDecibels: number;
    smoothingTimeConstant: number;
}

export interface AudioState {
    isMicMuted: boolean;
    isPlaybackMuted: boolean;
    volume: number;
}

export class AudioManager extends EventEmitter {
    private mediaStream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private isActive: boolean = false;
    private state: AudioState = {
        isMicMuted: false,
        isPlaybackMuted: false,
        volume: 1.0
    };
    private config: AudioConfig = {
        fftSize: 2048,
        minDecibels: -90,
        maxDecibels: -10,
        smoothingTimeConstant: 0.85
    };
    private lastEmitTime = 0;
    private readonly EMIT_INTERVAL = 100; // Throttle to 100ms intervals

    constructor(config?: Partial<AudioConfig>) {
        super();
        if (config) {
            this.config = { ...this.config, ...config };
        }
    }

    async initialize(): Promise<void> {
        if (this.isActive) {
            console.log('AudioManager: Already initialized');
            return;
        }
        
        try {
            console.log('AudioManager: Initializing audio context...');
            this.audioContext = new AudioContext();
            await this.audioContext.resume();

            console.log('AudioManager: Requesting microphone access...');
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false 
            });

            console.log('AudioManager: Setting up audio nodes...');
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            const processor = this.audioContext.createScriptProcessor(2048, 1, 1);
            
            // Create and configure analyzer
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = this.config.fftSize;
            this.analyser.minDecibels = this.config.minDecibels;
            this.analyser.maxDecibels = this.config.maxDecibels;
            this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;
            
            processor.onaudioprocess = this.handleAudioProcess.bind(this);

            // Connect the complete pipeline
            source.connect(this.analyser);
            this.analyser.connect(processor);
            processor.connect(this.audioContext.destination);
            
            this.isActive = true;
            console.log('AudioManager: Initialization complete with analyzer');
            this.emit('ready');
        } catch (error) {
            console.error('AudioManager: Initialization failed:', error);
            this.emit('error', error);
            throw error;
        }
    }

    private handleAudioProcess(e: AudioProcessingEvent): void {
        if (this.state.isMicMuted) return;

        const now = Date.now();
        if (now - this.lastEmitTime < this.EMIT_INTERVAL) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const audioData = new Int16Array(inputData.length);
        
        let maxAmplitude = 0;
        for (let i = 0; i < inputData.length; i++) {
            const sample = inputData[i];
            maxAmplitude = Math.max(maxAmplitude, Math.abs(sample));
            audioData[i] = Math.max(-32768, Math.min(32767, sample * 32768));
        }

        if (maxAmplitude > 0.01) {
            this.lastEmitTime = now;
            this.emit('audioData', new Uint8Array(audioData.buffer));
            console.log('AudioManager: Emitting audio data, max amplitude:', maxAmplitude.toFixed(3));
        }
    }

    setMicrophoneMuted(muted: boolean): void {
        if (!this.mediaStream) return;
        this.state.isMicMuted = muted;
        this.mediaStream.getAudioTracks().forEach(track => {
            track.enabled = !muted;
        });
        this.emit('stateChange', this.state);
    }

    async playRemoteAudio(audioData: Uint8Array) {
        if (!this.audioContext || this.state.isPlaybackMuted) return;

        try {
            const int16Data = new Int16Array(audioData.buffer);
            const float32Data = new Float32Array(int16Data.length);
            
            for (let i = 0; i < int16Data.length; i++) {
                float32Data[i] = int16Data[i] / 32768.0;
            }

            const audioBuffer = this.audioContext.createBuffer(
                1, 
                float32Data.length, 
                this.audioContext.sampleRate
            );
            audioBuffer.getChannelData(0).set(float32Data);

            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);
            source.start();
        } catch (error) {
            console.error('Failed to play remote audio:', error);
            this.emit('error', error);
        }
    }

    setPlaybackMuted(muted: boolean): void {
        this.state.isPlaybackMuted = muted;
        this.emit('stateChange', this.state);
    }

    getAnalyser(): AnalyserNode | null {
        return this.analyser;
    }

    getState(): AudioState {
        return { ...this.state };
    }

    stop(): void {
        if (!this.isActive) return;
        
        this.mediaStream?.getTracks().forEach(track => track.stop());
        this.audioContext?.close();
        this.isActive = false;
        this.mediaStream = null;
        this.audioContext = null;
        this.analyser = null;
        this.emit('stopped');
    }
}