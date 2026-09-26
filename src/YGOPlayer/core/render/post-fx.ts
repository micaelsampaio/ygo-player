/**
 * The duel view's post-processing, for fields that ask for it: an HDR frame,
 * a bloom that only picks up light brighter than white (the field's glows
 * are pushed above 1.0, card art never is — so cards never haze), and a
 * soft vignette. No global tone mapping: it would shift the card art.
 */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export interface PostFxOptions {
  bloomStrength?: number;
  bloomRadius?: number;
  /** Linear luminance above which light blooms (1 = only HDR light). */
  bloomThreshold?: number;
  vignette?: number;
  /** A colour grade multiplied over the frame (e.g. warm torchlight), [r, g, b]. */
  tint?: [number, number, number];
}

const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, uAmount: { value: 0.35 }, uTint: { value: new THREE.Vector3(1, 1, 1) } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uAmount; uniform vec3 uTint; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5));
      c.rgb *= mix(1.0, smoothstep(0.85, 0.25, d), uAmount);
      c.rgb *= uTint;
      gl_FragColor = c;
    }`,
};

export class PostFx {
  readonly composer: EffectComposer;
  private overlayPass: RenderPass;
  private bloom: UnrealBloomPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, overlay: THREE.Scene, camera: THREE.Camera, opts: PostFxOptions = {}) {
    const size = renderer.getSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x * renderer.getPixelRatio(), size.y * renderer.getPixelRatio(), { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    this.overlayPass = new RenderPass(overlay, camera);
    this.overlayPass.clear = false;
    this.overlayPass.clearDepth = true;
    this.overlayPass.enabled = false;
    this.composer.addPass(this.overlayPass);
    // Bloom at half resolution: soft glow is cheap there and looks the same.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), opts.bloomStrength ?? 0.9, opts.bloomRadius ?? 0.55, opts.bloomThreshold ?? 1.0);
    this.composer.addPass(this.bloom);
    const vignette = new ShaderPass(VignetteShader);
    vignette.uniforms.uAmount.value = opts.vignette ?? 0.35;
    if (opts.tint) vignette.uniforms.uTint.value.set(...opts.tint);
    this.composer.addPass(vignette);
    this.composer.addPass(new OutputPass());
  }

  setOverlay(enabled: boolean) {
    this.overlayPass.enabled = enabled;
  }

  setSize(width: number, height: number) {
    this.composer.setSize(width, height);
    this.bloom.setSize(width / 2, height / 2);
  }

  render() {
    this.composer.render();
  }

  dispose() {
    this.composer.dispose();
  }
}

/** A reflection map for a field's own glass and metal (applied per material, not scene-wide: cards stay untouched). */
export function createFieldEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return env;
}
