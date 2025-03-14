export interface VoiceMessage {
    type: 'voice';
    data: string;  // base64 encoded audio data
    senderId: string;
    timestamp: number;
}

export function isValidVoiceMessage(message: any): message is VoiceMessage {
    return (
        message &&
        message.type === 'voice' &&
        typeof message.data === 'string' &&
        typeof message.senderId === 'string' &&
        typeof message.timestamp === 'number'
    );
}