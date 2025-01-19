import * as THREE from 'three';

export class YGOMath {
    static degToRad(degrees: number): number {
        return degrees * (Math.PI / 180);
    }
    
    static radToDeg(radians: number): number {
        return radians * (180 / Math.PI);
    }

    static degToRadEuler(x: number, y: number, z: number) {
        return new THREE.Euler(
            YGOMath.degToRad(x),
            YGOMath.degToRad(y),
            YGOMath.degToRad(z),
        )
    }

}