import * as THREE from 'three';
import { globalUniforms } from '../../core/YGOPlayerCore';

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

export interface CardMaterialGrayscaleParameters extends THREE.MeshBasicMaterialParameters { }

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


export interface CardTransparentOverlayParameters extends THREE.MeshBasicMaterialParameters {
    backTexture?: THREE.Texture;
    opacity?: number;
    linearCorrection?: number;
    animationDuration?: number;
    minOpacity?: number;
    maxOpacity?: number;
}

export class CardTransparentOverlay extends THREE.MeshBasicMaterial {
    private linearCorrection: number;
    private backTexture: THREE.Texture | null;
    private animationDuration: number;
    private minOpacity: number;
    private maxOpacity: number;
    private uniforms: {
        backTexture: { value: THREE.Texture | null };
        animationDuration: { value: number };
        minOpacity: { value: number };
        maxOpacity: { value: number };
    };

    constructor(parameters: CardTransparentOverlayParameters = {}) {
        super(parameters);

        this.transparent = true;
        this.opacity = parameters.opacity ?? 1.0;
        this.linearCorrection = parameters.linearCorrection ?? 1.8;
        this.backTexture = parameters.backTexture ?? null;
        this.animationDuration = parameters.animationDuration ?? 2.0; // Duration in seconds
        this.minOpacity = parameters.minOpacity ?? 0.3;
        this.maxOpacity = parameters.maxOpacity ?? 0.8;

        this.uniforms = {
            backTexture: { value: this.backTexture },
            animationDuration: { value: this.animationDuration },
            minOpacity: { value: this.minOpacity },
            maxOpacity: { value: this.maxOpacity }
        };

        this.onBeforeCompile = (shader: any) => {
            shader.uniforms.backTexture = this.uniforms.backTexture;
            shader.uniforms.animationDuration = this.uniforms.animationDuration;
            shader.uniforms.minOpacity = this.uniforms.minOpacity;
            shader.uniforms.maxOpacity = this.uniforms.maxOpacity;
            shader.uniforms.u_time = globalUniforms.time;

            shader.fragmentShader = shader.fragmentShader.replace(
                'uniform float opacity;',
                `
          uniform float opacity;
          uniform sampler2D backTexture;
          uniform float u_time;
          uniform float animationDuration;
          uniform float minOpacity;
          uniform float maxOpacity;
  
          float easeInOutSine(float x) {
            return -(cos(3.14159265359 * x) - 1.0) / 2.0;
          }
  
          float triangleWave(float x) {
            return abs(mod(x, 2.0) - 1.0);
          }
          `
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                `
          #ifdef USE_MAP
            vec4 sampledDiffuseColor = texture2D(map, vMapUv);
            diffuseColor *= vec4(pow(sampledDiffuseColor.rgb, vec3(${this.linearCorrection.toFixed(1)})), sampledDiffuseColor.a);
  
            vec4 backColor = texture2D(backTexture, vMapUv);
            // Use global u_time to control the opacity animation
            float progress = triangleWave(u_time / animationDuration);
            float easedProgress = easeInOutSine(progress);
            float animatedOpacity = mix(minOpacity, maxOpacity, easedProgress);
            diffuseColor.rgb = mix(diffuseColor.rgb, backColor.rgb, animatedOpacity);
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

    /**
     * Set the back texture
     */
    setBackTexture(texture: THREE.Texture): this {
        this.backTexture = texture;
        this.uniforms.backTexture.value = texture;
        this.needsUpdate = true;
        return this;
    }

    /**
     * Get the back texture
     */
    getBackTexture(): THREE.Texture | null {
        return this.backTexture;
    }

    /**
     * Set min and max opacity values for the animation
     */
    setOpacityRange(min: number, max: number): this {
        this.minOpacity = min;
        this.maxOpacity = max;
        this.uniforms.minOpacity.value = min;
        this.uniforms.maxOpacity.value = max;
        this.needsUpdate = true;
        return this;
    }

    /**
     * Set animation duration in seconds
     */
    setAnimationDuration(duration: number): this {
        this.animationDuration = duration;
        this.uniforms.animationDuration.value = duration;
        this.needsUpdate = true;
        return this;
    }
}
