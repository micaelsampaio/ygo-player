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

export interface AudioEvents {
    onAudioData: (data: Uint8Array) => void;
    onVolumeChange: (volume: number) => void;
    onStateChange: (state: AudioState) => void;
    onError: (error: Error) => void;
}