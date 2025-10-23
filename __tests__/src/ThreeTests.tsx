import * as THREE from 'three';
import "../../src/YGOPlayer/style/style.css";
import { useEffect, useState } from "react";
import { YGODuel } from "../../src/YGOPlayer/core/YGODuel";
import { YGOPlayerCore } from "../../src/YGOPlayer/core/YGOPlayerCore";
import type { YGOEntity } from "../../src/YGOPlayer/core/YGOEntity";
import { YGOMouseEvents } from "../../src/YGOPlayer/core/components/YGOMouseEvents";
import { YGOTaskController } from "../../src/YGOPlayer/core/components/tasks/YGOTaskController";
import { YGOAssets } from "../../src/YGOPlayer/core/YGOAssets";
import { YGOSoundController } from "../../src/YGOPlayer/core/YGOSoundController";
import { GameController } from "../../src/YGOPlayer/game/GameController";
import { YGOMapClick } from '../../src/YGOPlayer/core/YGOMapClick';
import { YGOComponent } from '../../src/YGOPlayer/core/YGOComponent';
import { YGOTaskSequence } from '../../src/YGOPlayer/core/components/tasks/YGOTaskSequence';
import { PositionTransition } from '../../src/YGOPlayer/duel-events/utils/position-transition';
import { CallbackTransition } from '../../src/YGOPlayer/duel-events/utils/callback';
import { Ease } from '../../src/YGOPlayer/scripts/ease';
import { WaitForSeconds } from '../../src/YGOPlayer/duel-events/utils/wait-for-seconds';
import { ScaleTransition } from '../../src/YGOPlayer/duel-events/utils/scale-transition';
import { MultipleTasks } from '../../src/YGOPlayer/duel-events/utils/multiple-tasks';
import { MaterialOpacityTransition } from '../../src/YGOPlayer/duel-events/utils/material-opacity';

const CDN_PATH = "http://localhost:8080";

class TempScene extends YGOComponent {
  private arc!: THREE.Mesh;
  private cube!: THREE.Mesh;
  private arcMaterial!: THREE.ShaderMaterial;
  private elapsedTime: number = 0;
  private mousePosition!: THREE.Vector3;

  constructor(private duel: YGODuel) {
    super("scene");

    // const geometry = new THREE.BoxGeometry(1, 1, 1);
    // const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    // const cube = new THREE.Mesh(geometry, material);
    // this.duel.core.scene.add(cube);

    // this.cube = cube;

    this.duel.core.camera.position.set(0, 0, 10);

    //this.attackEffect();


    const cb = () => {
      // this.attackingEffect({
      //   startTask: this.duel.tasks.startTask.bind(this.duel.tasks)
      // })
      this.tributeEffect({ startTask: this.duel.tasks.startTask.bind(this.duel.tasks) })
    }
    setInterval(() => {
      cb();
    }, 2000)
    cb();
  }

  public tributeEffect({ startTask }: any) {

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshBasicMaterial({
        map: this.duel.core.textureLoader.load(this.duel.createCdnUrl("/images/particles/smoke_02.png")),
        transparent: true,
      })
    );
    sphere.rotateY(THREE.MathUtils.degToRad(Math.random() * 360))
    sphere.scale.set(0, 0, 0);

    const star = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({
        map: this.duel.core.textureLoader.load(this.duel.createCdnUrl("/images/particles/star_08.png")),
        transparent: true,
      })
    )
    star.scale.set(0.5, 0.5, 0.5);
    this.duel.core.scene.add(star);
    this.duel.core.scene.add(sphere);

    startTask(new YGOTaskSequence(
      new MultipleTasks(
        new ScaleTransition({
          gameObject: sphere,
          scale: new THREE.Vector3(2, 2, 2),
          duration: 0.25
        }),
        new MaterialOpacityTransition({
          material: sphere.material,
          opacity: 0,
          duration: 0.25,
        }),
        new ScaleTransition({
          gameObject: star,
          scale: new THREE.Vector3(3, 3, 3),
          duration: 0.15
        }),
        new MaterialOpacityTransition({
          material: star.material,
          opacity: 0,
          duration: 0.15,
        })
      ),
      new WaitForSeconds(1),
      new CallbackTransition(() => {
        this.duel.core.scene.remove(sphere);
        this.duel.core.scene.remove(star);
      })
    ))
  }

  public attackingEffect({ startTask }: any) {
    const position = new THREE.Vector3(0, 0, 0);
    const circleTexture = this.duel.core.textureLoader.load(this.duel.createCdnUrl("/images/particles/circle_03.png"));
    const circle = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8, 8),
      new THREE.MeshBasicMaterial({
        color: 0xffd230,
        map: circleTexture,
        transparent: true,
      })
    );
    this.duel.core.scene.add(circle);
    const circleLarge = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xefb100,
        map: circleTexture,
        transparent: true,
      })
    );
    this.duel.core.scene.add(circleLarge);
    const flare = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 15, 15),
      new THREE.MeshBasicMaterial({
        color: 0xffd230,
        transparent: true,
        map: this.duel.core.textureLoader.load(this.duel.createCdnUrl("/images/particles/star_07.png"))
      })
    );
    this.duel.core.scene.add(flare);

    circle.scale.set(0, 0, 0);
    circle.position.copy(position);
    circle.material.opacity = 0;

    circleLarge.scale.set(0, 0, 0);
    circleLarge.position.copy(position);
    circleLarge.position.z -= 0.1;
    circleLarge.material.opacity = 0;

    flare.position.copy(position);
    flare.position.z += 0.1;
    flare.scale.set(0, 0, 0);
    flare.material.opacity = 0;

    startTask(new YGOTaskSequence(
      new MultipleTasks(
        new ScaleTransition({
          gameObject: flare,
          scale: new THREE.Vector3(1, 1, 1),
          duration: 0.15
        }),
        new MaterialOpacityTransition({
          material: flare.material,
          duration: 0.1,
          opacity: 1
        })
      ),
      new MultipleTasks(
        new ScaleTransition({
          gameObject: flare,
          scale: new THREE.Vector3(0.5, 0.5, 0.5),
          duration: 0.15
        }),
        new MaterialOpacityTransition({
          material: flare.material,
          duration: 0.15,
          opacity: 0
        })
      ),
      new WaitForSeconds(0.5),
      new CallbackTransition(() => {
        this.duel.core.scene.remove(circle);
        this.duel.core.scene.remove(circleLarge);
        this.duel.core.scene.remove(flare);
      })
    ));

    startTask(new YGOTaskSequence(
      new MultipleTasks(
        new ScaleTransition({
          gameObject: circle,
          scale: new THREE.Vector3(1, 1, 1),
          duration: 0.2
        }),
        new MaterialOpacityTransition({
          material: circle.material,
          duration: 0.1,
          opacity: 1
        })
      ),
      new WaitForSeconds(0.15),
      new MaterialOpacityTransition({
        material: circle.material,
        duration: 0.2,
        opacity: 0
      })
    ));

    startTask(new YGOTaskSequence(
      new MultipleTasks(
        new ScaleTransition({
          gameObject: circleLarge,
          scale: new THREE.Vector3(1, 1, 1),
          duration: 0.15
        }),
        new MaterialOpacityTransition({
          material: circleLarge.material,
          duration: 0.1,
          opacity: 1
        })
      ),
      new MultipleTasks(
        new ScaleTransition({
          gameObject: circleLarge,
          scale: new THREE.Vector3(1.5, 1.5, 1.5),
          duration: 0.2
        }),
        new MaterialOpacityTransition({
          material: circleLarge.material,
          duration: 0.2,
          opacity: 0
        })
      ),
    ));
  }

  public attackEffect() {

    this.mousePosition = new THREE.Vector3();
    const plane = new THREE.PlaneGeometry(20, 20);
    const planeMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true, opacity: 0, transparent: true });
    const planeMesh = new THREE.Mesh(plane, planeMaterial);
    planeMesh.name = "mouse_attack_floor";
    this.duel.core.scene.add(planeMesh);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    // On click
    window.addEventListener('mousemove', (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, this.duel.core.camera);
      const intersects = raycaster.intersectObjects([planeMesh], true);

      if (intersects.length > 0) {
        const intersection = intersects[0];
        const point = intersection.point;
        this.mousePosition = point.clone();
      }
    });
    const texture = this.duel.core.textureLoader.load("http://localhost:8080/images/particles/player-0-attack.png");
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearFilter;
    const arcMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: texture },
        uTime: { value: 0 },
        uSpeed: { value: 0.5 },
        uRepeat: { value: new THREE.Vector2(1, 1) } // dynamic repeat
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
    `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uTime;
        uniform float uSpeed;
        uniform vec2 uRepeat;
        varying vec2 vUv;

        void main() {
            // Apply dynamic repeat
            vec2 uv = vUv * uRepeat;

            // Slide the texture
            uv.y -= uTime * uSpeed;

            gl_FragColor = texture2D(uTexture, uv);
        }
    `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    arcMaterial.uniforms.uRepeat.value.set(1, 15);
    arcMaterial.uniforms.uSpeed.value = 2.5;

    this.arcMaterial = arcMaterial;

    const arc = createArcMesh(3, 1, 10, arcMaterial);
    this.duel.core.scene.add(arc);
    this.arc = arc;
    this.arc.rotateX(90);
  }

  public update(dt: number): void {
    // this.elapsedTime += dt;
    // //this.cube.rotation.x += dt;
    // //this.cube.rotation.z += dt;
    // //this.cube.rotation.y += dt;
    // this.arcMaterial.uniforms.uTime.value = this.elapsedTime;

    // const midPoint = new THREE.Vector3()
    //   .addVectors(this.cube.position, this.mousePosition)
    //   .multiplyScalar(0.5);

    // midPoint.z = 1;

    // // Set arc position to midpoint
    // this.arc.position.copy(midPoint);

    // const distance = this.cube.position.distanceTo(this.mousePosition);
    // this.arc.scale.z = distance / 6.5;
    // this.arcMaterial.uniforms.uRepeat.value.set(1, this.arc.scale.z * 15);

    // const direction = new THREE.Vector3();
    // direction.subVectors(this.cube.position, this.mousePosition);
    // const angle = Math.atan2(direction.x, -direction.y);

    // this.arc.rotation.y = angle;
    // //lookAtY(this.cube, this.mousePosition);
    // //this.cube.rotateZ(dt);
  }
}
function lookAtY(object: THREE.Object3D, targetPosition: THREE.Vector3) {
  const direction = new THREE.Vector3();
  direction.subVectors(targetPosition, object.position);
  const angleY = Math.atan2(-direction.x, -direction.z);
  object.rotation.y = angleY;

  console.log("angle Y", angleY);
}

function createArcMesh(radius: number, height: number, numSegments: number, material: THREE.Material) {
  const ARC_ANGLE = Math.PI * 0.75;   // arc span
  const STRIP_WIDTH = radius * 0.25;  // width across arc
  const N = Math.max(1, Math.floor(numSegments));

  const positions = [];
  const uvs = [];
  const indices = [];

  const centerline = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const theta = -ARC_ANGLE * 0.5 + t * ARC_ANGLE;

    const x = 0;
    const z = Math.sin(theta) * radius;
    const y = height * Math.sin(Math.PI * t);

    centerline.push(new THREE.Vector3(x, y, z));
  }

  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = centerline[i];

    // tangent in XZ plane
    let tangent;
    if (i === 0) tangent = centerline[1].clone().sub(p);
    else if (i === N) tangent = p.clone().sub(centerline[N - 1]);
    else tangent = centerline[i + 1].clone().sub(centerline[i - 1]);

    tangent.y = 0;
    tangent.normalize();

    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const halfW = STRIP_WIDTH * 0.5;

    const left = p.clone().addScaledVector(side, -halfW);
    const right = p.clone().addScaledVector(side, halfW);

    // positions
    positions.push(left.x, left.y, left.z);
    positions.push(right.x, right.y, right.z);

    uvs.push(1, 1 - t);
    uvs.push(0, 1 - t);
  }

  for (let i = 0; i < N; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;

    indices.push(a, b, c);
    indices.push(b, d, c);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return new THREE.Mesh(geom, material);
}

export function ThreeTestsPage() {

  const [duel, setDuel] = useState<YGODuel>();

  useEffect(() => {
    const tempDuel = new TempDuel() as any as YGODuel;
    setDuel(tempDuel);
  }, [])

  return <div className="ygo-player-core" style={{ maxHeight: "100dvh" }} id="ygo-player-core" {...duel?.mouseEvents.eventsReference}>
    <canvas id='ygo-canvas' style={{ width: "100%", height: "100%" }}>
    </canvas>
  </div>

}

class TempDuel {
  public duel: YGODuel;
  public core: YGOPlayerCore;
  public assets: YGOAssets;
  public soundController = new YGOSoundController();
  public entities: YGOEntity[];
  public gameController: GameController;
  public mouseEvents: YGOMouseEvents;
  public tasks: YGOTaskController;
  public deltaTime: number = 0;

  constructor() {
    this.core = new YGOPlayerCore({ canvas: document.querySelector("canvas") as any });
    this.core.timeScale = 1;
    this.core.renderer.setAnimationLoop(this.update.bind(this));
    this.deltaTime = 0;
    this.entities = [];
    this.duel = this as any as YGODuel;

    this.mouseEvents = new YGOMouseEvents(this.duel);
    this.gameController = new GameController(this.duel);
    this.tasks = new YGOTaskController(this.duel);
    this.soundController = new YGOSoundController();
    this.mouseEvents = new YGOMouseEvents(this.duel);
    this.assets = new YGOAssets(this.duel);

    this.gameController.addComponent("mouse_events", this.mouseEvents);
    this.gameController.addComponent("sound_controller", this.soundController);
    this.gameController.addComponent("tasks", this.tasks);
    this.gameController.addComponent("map-click-zone", new YGOMapClick(this.duel));
    this.gameController.addComponent("scene", new TempScene(this.duel));

    const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
    directionalLight.position.set(20, 40, 25);
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    directionalLight.shadow.bias = -0.0005;
    directionalLight.shadow.normalBias = 0.04;

    this.core.scene.add(new THREE.AmbientLight('white', 1));
    this.core.scene.add(directionalLight);
    this.core.scene.add(directionalLight.target);

    this.entities.push(this.gameController);
  }

  public createCdnUrl(path: string) {
    return `${CDN_PATH}${path}`;
  }

  private update() {
    this.core.render();
    this.deltaTime = this.core.deltaTime;
    for (const entity of this.entities) {
      if (entity.enabled) {
        entity.update(this.deltaTime);
      }
    }
  }
}
