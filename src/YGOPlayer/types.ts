import * as THREE from 'three';
import { Card, CardData, FieldZone, FileldStateEntry, YGOProps, YGOPropsOptions, YGOReplayData } from '../YGOCore/types/types';

export enum YGODuelState {
    REPLAY = "replay",
    PLAY = "play",
    EDITOR = "editor",
    EXEC_COMMAND = "exec_command",
    UNDO_COMMAND = "undo_command",
}
export interface GameFieldLocation {
    zone: string
    position: THREE.Vector3
    rotation: THREE.Euler
    gameObject: THREE.Mesh
    side: number
}

export interface YGOUiElement {
    gameObject: THREE.Object3D
    isUiElement?: boolean
    isUiElementClick?: boolean
    isUiElementHover?: boolean
    onMouseClick?(event: MouseEvent): void
    onMouseEnter?(event: MouseEvent): void
    onMouseLeave?(event: MouseEvent): void
}

export interface CardZoneKV {
    card: Card,
    zone: FieldZone
}

export interface YGOPlayerData {
    name: string,
    mainDeck: CardData[],
    extraDeck: CardData[],
}
export interface YGOReplayDeckData {
    mainDeck: CardData[],
    extraDeck: CardData[],
}

export interface YGOPlayerStartEditorProps {
    cdnUrl: string,
    players: YGOPlayerData[],
    options: YGOPropsOptions
}

export interface YGOPlayerStartReplayProps {
    cdnUrl: string,
    decks: YGOReplayDeckData[],
    replay: YGOReplayData,
    options: YGOPropsOptions
}