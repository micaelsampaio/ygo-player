import * as THREE from 'three';

export enum YGODuelState {
    REPLAY = "replay",
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