import { Commands } from './commands';

export * from './game/YGOCore';
export * from './game/YGODuelLog';
export * from './game/YGOGameUtils';
export * from './types/duel-events';
export * from './commands/JSONCommand';

export const YGOCommands = Commands;

export const debug_version = "1.0.1";