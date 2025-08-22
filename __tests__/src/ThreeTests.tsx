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

class TempScene extends YGOComponent {
  private cube: THREE.Mesh;

  constructor(private duel: YGODuel) {
    super("scene");

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    this.duel.core.scene.add(cube);

    this.cube = cube;

    this.duel.core.camera.position.set(0, 0, 10);
  }

  public update(dt: number): void {
    this.cube.rotation.x += dt;
    this.cube.rotation.z += dt;
    this.cube.rotation.z += dt;
  }
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
