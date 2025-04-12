import * as THREE from 'three';

export interface CardMaterialParameters extends THREE.MeshBasicMaterialParameters {
    linearCorrection?: number; // Optional gamma correction factor
}

export class CardMaterial extends THREE.MeshBasicMaterial {
    private linearCorrection: number;

    constructor(parameters: CardMaterialParameters = {}) {
        super(parameters);

        this.linearCorrection = parameters.linearCorrection ?? 1.8;

        this.onBeforeCompile = (shader: any) => {
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                `
        #ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D(map, vMapUv);
          // Force linear handling of this specific texture
          diffuseColor *= vec4(pow(sampledDiffuseColor.rgb, vec3(${this.linearCorrection.toFixed(1)})), sampledDiffuseColor.a);
        #endif
        `
            );
        };

        this.needsUpdate = true;
    }

    /**
     * Set the linear correction factor
     */
    setLinearCorrection(value: number): this {
        this.linearCorrection = value;
        this.needsUpdate = true;
        return this;
    }

    /**
     * Get the current linear correction factor
     */
    getLinearCorrection(): number {
        return this.linearCorrection;
    }
}

export interface CardMaterialGrayscaleParameters extends THREE.MeshBasicMaterialParameters {}

export class CardMaterialGrayscale extends THREE.MeshBasicMaterial {
    constructor(parameters: CardMaterialGrayscaleParameters = {}) {
        super(parameters);

        this.onBeforeCompile = (shader: any) => {
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                `
        #ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D(map, vMapUv);
          // Convert to grayscale using luminance formula
          float gray = dot(sampledDiffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          diffuseColor *= vec4(vec3(gray), sampledDiffuseColor.a);
        #endif
        `
            );
        };

        this.needsUpdate = true;
    }
}
