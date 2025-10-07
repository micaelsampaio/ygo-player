import { YGODuel } from "../core/YGODuel";
import * as THREE from "three";
import { YGOStatic } from "../core/YGOStatic";

export class YGOGameFieldObject {

  public gameObject!: THREE.Object3D;
  public fieldSideGameObject!: THREE.Object3D;

  constructor(private duel: YGODuel, field: THREE.Scene, private player: number) {
    this.gameObject = field;

    this.fieldSideGameObject = field.children.find(child => child.name === "player_turn_field")! as THREE.Mesh;

    if (this.fieldSideGameObject) {
      this.fieldSideGameObject.visible = player === 0;

      let material: THREE.ShaderMaterial;

      if (YGOStatic.isPlayerPOV(player)) {
        material = createMaterial(
          new THREE.Vector4(0, 0, 1.0, 0),
          new THREE.Vector4(0, 0, 1.0, 0.2),
          new THREE.Vector4(0, 0, 1.0, 0.4),
        );
      } else {
        material = createMaterial(
          new THREE.Vector4(1, 0, 0, 0),
          new THREE.Vector4(1, 0, 0, 0.2),
          new THREE.Vector4(1, 0, 0, 0.4),
        );
      }

      (this.fieldSideGameObject as THREE.Mesh).material = material;
    }

    this.duel.ygo.events.on("set-player", ({ player }) => {
      if (this.fieldSideGameObject) {
        this.fieldSideGameObject.visible = player === this.player;
      }
    });
  }
}

function createMaterial(color1: THREE.Vector4, color2: THREE.Vector4, color3: THREE.Vector4) {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      color1: { value: color1 },
      color2: { value: color2 },
      color3: { value: color3 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec4 color1;
      uniform vec4 color2;
      uniform vec4 color3;
      varying vec2 vUv;

      void main() {
        vec4 color;
        if (vUv.y < 0.5) {
          // Blend from color1 to color2 from y=0 to y=0.5
          float t = vUv.y * 2.0;
          color = mix(color1, color2, t);
        } else {
          // Blend from color2 to color3 from y=0.5 to y=1.0
          float t = (vUv.y - 0.5) * 2.0;
          color = mix(color2, color3, t);
        }
        gl_FragColor = color;
      }
    `,
  });

  return material;
}
