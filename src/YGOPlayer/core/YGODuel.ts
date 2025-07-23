import * as THREE from "three";
import { YGOPlayerCore } from "./YGOPlayerCore";
import { YGODuelState, YGOUiElement } from "../types";
import { JSONCommand, YGOCore, YGOGameUtils } from "ygo-core";
import { YGOEntity } from "./YGOEntity";
import { GameController } from "../game/GameController";
import { EventBus } from "../scripts/event-bus";
import { YGOMouseEvents } from "./components/YGOMouseEvents";
import { createFields, getTransformFromCamera } from "../scripts/ygo-utils";
import { PlayerField } from "../game/PlayerField";
import { GameCardHand } from "../game/GameCardHand";
import { ActionCardSelection } from "../actions/ActionSelectCard";
import { YGOActionManager as ActionManager } from "./components/YGOAction";
import { ActionCardHandMenu } from "../actions/ActionCardHandMenu";
import { ActionCardZoneMenu } from "../actions/ActionCardZoneMenu";
import { YGOTaskController } from "./components/tasks/YGOTaskController";
import { GameCard } from "../game/GameCard";
import { PositionTransition } from "../duel-events/utils/position-transition";
import { YGOTaskSequence } from "./components/tasks/YGOTaskSequence";
import { WaitForSeconds } from "../duel-events/utils/wait-for-seconds";
import { CallbackTransition } from "../duel-events/utils/callback";
import { YGOCommandsController } from "./components/tasks/YGOCommandsController";
import { YGOAssets } from "./YGOAssets";
import { YGOGameActions } from "./YGOGameActions";
import { createCardSelectionGeometry } from "../game/meshes/CardSelectionMesh";
import { YGODuelScene } from "./YGODuelScene";
import { YGOConfig } from "./YGOConfig";
import { Command } from "ygo-core";
import { YGOMapClick } from "./YGOMapClick";
import { YGOGameFieldStatsComponent } from "../game/YGOGameFieldStatsComponent";
import { YGOSoundController } from "./YGOSoundController";
import { YGOPlayerSettingsAdapter } from "./YGOPlayerSettings";
import { HotKeyManager } from "../scripts/hotkey-manager";

export class YGODuel {
  public ygo!: InstanceType<typeof YGOCore>;
  public state: YGODuelState;
  public core: YGOPlayerCore;
  public assets: YGOAssets;
  public soundController = new YGOSoundController();
  public fields: PlayerField[];
  public fieldStats!: YGOGameFieldStatsComponent;
  public camera: THREE.PerspectiveCamera;
  public entities: YGOEntity[];
  public events: EventBus<any>;
  public actionManager: ActionManager;
  public gameActions: YGOGameActions;
  public gameController: GameController;
  public mouseEvents: YGOMouseEvents;
  public tasks: YGOTaskController;
  public commands: YGOCommandsController;
  public deltaTime: number = 0;
  private currentPlayerIndex = 0;
  public config: YGOConfig;
  public duelScene: YGODuelScene;
  public settings: YGOPlayerSettingsAdapter;
  public globalHotKeysManager: HotKeyManager;
  constructor({
    canvas,
    config,
  }: {
    canvas: HTMLCanvasElement;
    config: YGOConfig;
  }) {
    this.state = YGODuelState.EDITOR;
    this.config = config;
    this.settings = new YGOPlayerSettingsAdapter();

    if (this.config.autoChangePlayer === undefined) {
      this.config.autoChangePlayer = true;
    }

    this.core = new YGOPlayerCore({ canvas });
    this.core.timeScale = this.settings.getGameSpeed();
    this.core.renderer.setAnimationLoop(this.update.bind(this));
    this.camera = this.core.camera;
    this.entities = [];
    this.fields = [];
    this.duelScene = new YGODuelScene(this);
    this.gameController = new GameController(this);
    this.actionManager = new ActionManager();
    this.tasks = new YGOTaskController(this);
    this.commands = new YGOCommandsController(this);
    this.soundController = new YGOSoundController();
    this.mouseEvents = new YGOMouseEvents(this);
    this.assets = new YGOAssets(this);
    this.events = new EventBus();

    this.globalHotKeysManager = new HotKeyManager([{
      keys: "c",
      action: "toggleControls"
    }, {
      keys: "d",
      action: "toggleDuelLogs"
    }, {
      keys: "ArrowLeft",
      action: "previousCommand"
    }, {
      keys: "ArrowRight",
      action: "nextCommand"
    }, {
      keys: "p",
      action: "togglePlayPause"
    }]);

    this.globalHotKeysManager.on("toggleControls", () => {
      this.events.dispatch("toggle-ui-menu", { group: "game-overlay", type: "controls-menu" });
    });

    this.globalHotKeysManager.on("toggleDuelLogs", () => {
      this.events.dispatch("toggle-ui-menu", { group: "game-overlay", type: "duel-log" });
    });

    this.globalHotKeysManager.on("previousCommand", () => {
      this.commands.previousCommand();
    });

    this.globalHotKeysManager.on("nextCommand", () => {
      this.commands.nextCommand();
    });

    this.globalHotKeysManager.on("togglePlayPause", () => {
      this.commands.play();
    });

    // const toggleDuelLogs = useCallback(() => {

    //     }, [duel]);

    //     const toggleGameReplayControls = useCallback(() => {
    //         duel.events.dispatch("toggle-ui-menu", { group: "game-overlay", type: "controls-menu" });
    //     }, [duel]);

    //     const toggleSettings = useCallback(() => {
    //         duel.events.dispatch("toggle-ui-menu", { group: "game-overlay", type: "settings-menu" });
    //     }, [duel]);

    //     const showGameStats = useCallback(() => {
    //         duel.events.dispatch("close-ui-menu", { group: "game-overlay" });
    //         duel.fieldStats.show();

    this.gameController.addComponent("mouse_events", this.mouseEvents);
    this.gameController.addComponent("sound_controller", this.soundController);
    this.gameController.addComponent("tasks", this.tasks);
    this.gameController.addComponent("commands", this.commands);
    this.gameController.addComponent("actions_manager", this.actionManager);
    this.gameController.addComponent("action_card_selection", new ActionCardSelection({ duel: this }));
    this.gameController.addComponent("map-click-zone", new YGOMapClick(this));
    this.actionManager.actions.set("card-hand-menu", new ActionCardHandMenu(this));
    this.actionManager.actions.set("card-zone-menu", new ActionCardZoneMenu(this));
    this.gameActions = new YGOGameActions(this);

    this.soundController.addLayer({ name: "GAME", volume: this.settings.getGameVolume() });
    this.soundController.addLayer({ name: "GAME_MUSIC", volume: this.settings.getMusicVolume(), useTimeScale: false });

    this.setupVars();

    this.core.events.on("on-timescale-change", (timeScale: number) => this.soundController.setTimeScale(timeScale));
    this.ygo = new YGOCore(this.config);

    (window as any).YGODuel = this;
  }

  async load() {
    try {
      const [fieldModel, gameFieldScene] = await Promise.all([
        this.assets.loadGLTF(`${this.config.cdnUrl}/models/field.glb`),
        this.assets.loadGLTF(`${this.config.cdnUrl}/models/game_field.glb`),
        this.assets.loadGLTF(`${this.config.cdnUrl}/models/destroy_effect.glb`),
        this.assets.loadGLTF(`${this.config.cdnUrl}/models/field_objects.glb`),
        this.core.loadFontAsync(
          "GameFont",
          "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json"
        ),
        this.assets.loadImages(
          `${this.config.cdnUrl}/images/ui/card_icons.png`,
          `${this.config.cdnUrl}/images/ui/ic_stars128.png`,
          `${this.config.cdnUrl}/images/ui/ic_rank128.png`,
          `${this.config.cdnUrl}/images/ui/ic_link128.png`,
          `${this.config.cdnUrl}/images/ui/turn_player_1.png`,
          `${this.config.cdnUrl}/images/ui/turn_player_2.png`,
          `${this.config.cdnUrl}/images/ui/ic_xyz_materials128.png`
        ),
        this.soundController.loadSounds(
          this.createCdnUrl("/sounds/card-place-1.ogg"),
          this.createCdnUrl("/sounds/card-place-2.ogg"),
          this.createCdnUrl("/sounds/card-place-3.ogg")
        ),
        //this.assets.loadTextures(Array.from((this.ygo.state as any).cardsIngame.values()).map(id => `http://127.0.0.1:8080/images/cards_small/${id}.jpg`)),
      ]);

      this.fields = createFields({ duel: this, fieldModel: fieldModel.scene });
      this.fieldStats = new YGOGameFieldStatsComponent(this);
      this.entities.push(this.gameController);

      this.gameController.getComponent<ActionCardSelection>("action_card_selection").createCardSelections();

      this.duelScene.createFields({ gameField: gameFieldScene.scene });
      this.duelScene.createGameMusic();

      this.settings.events.on("onShowFaceDownCardsTransparentChange", (oldValue, showTransparentCards) => {
        this.fields.forEach(field => {

          field.monsterZone.forEach(zone => {
            zone.getGameCard()?.updateTransparentCardsState(showTransparentCards);
          })
          field.extraMonsterZone.forEach(zone => {
            zone.getGameCard()?.updateTransparentCardsState(showTransparentCards);
          })
          field.spellTrapZone.forEach(zone => {
            zone.getGameCard()?.updateTransparentCardsState(showTransparentCards);
          })
        })
      });

      this.settings.events.on("onGameVolumeChange", (_, value) => this.soundController.setLayerVolume("GAME", value));
      this.settings.events.on("onMusicVolumeChange", (_, value) => this.soundController.setLayerVolume("GAME_MUSIC", value));
      this.settings.events.on("onGameSpeedChange", (_, value) => this.core.setTimeScale(value));

      this.core.updateCamera();
    } catch (error) {
      console.error("ERROR:");
      console.error("TCL:", error);
      alert("ERROR");
    }
  }

  public startDuel() {
    this.ygo.events.on("new-log", (command: any) => {
      if (this.commands.isRecovering()) return;
      console.log("-------------- command ------------");
      console.log("command >>> ", command);

      this.events.dispatch("render-ui");
      this.commands.add(command);
    });

    this.ygo.events.on("update-logs", (data: any) => {
      this.events.dispatch("logs-updated", data);
    });

    this.ygo.events.on("set-player", (data: any) => {
      this.currentPlayerIndex = data.player;
      this.events.dispatch("render-ui");
    });

    this.events.on("enable-game-actions", () => {
      this.actionManager.actionsEnabled = true;
    });

    this.events.on("disable-game-actions", () => {
      this.actionManager.clearAction();
      this.actionManager.actionsEnabled = false;
    });

    setTimeout(() => {
      try {
        this.ygo.start();
        this.updateField();
      } catch (error) {
        console.log("ERROR", error);
        alert("ERROR");
      }
    }); // next frame call
  }

  public updateField() {
    for (let playerIndex = 0; playerIndex < this.fields.length; ++playerIndex) {
      const gameField = this.fields[playerIndex];
      const duelField = this.ygo.state.fields[playerIndex];

      for (let i = 0; i < gameField.monsterZone.length; ++i) {
        const cardZone = gameField.monsterZone[i];
        const card = duelField.monsterZone[i];
        cardZone.setCard(card);
      }

      for (let i = 0; i < gameField.spellTrapZone.length; ++i) {
        const cardZone = gameField.spellTrapZone[i];
        const card = duelField.spellTrapZone[i];
        cardZone.setCard(card);
      }

      this.updateHand(playerIndex);
      this.updateExtraDeck(playerIndex);

      const fieldZoneCard = gameField.fieldZone;
      const fieldZoneCardZone = duelField.fieldZone;
      fieldZoneCard.setCard(fieldZoneCardZone);
      fieldZoneCard.updateCard();
    }

    for (let i = 0; i < 2; ++i) {
      const player = this.ygo.state.fields[0].extraMonsterZone[i] ? 0 : this.ygo.state.fields[1].extraMonsterZone[i] ? 1 : 0;
      const cardFromPlayer = this.ygo.state.fields[0].extraMonsterZone[i] ?? this.ygo.state.fields[1].extraMonsterZone[i];
      const cardZone = this.fields[player].extraMonsterZone[i];
      cardZone.setCard(cardFromPlayer);
    }

    this.renderField();
    this.fieldStats.update();
    this.events.dispatch("render-ui");
  }

  public updateHand(playerIndex: number) {
    const gameField = this.fields[playerIndex];
    const duelField = this.ygo.state.fields[playerIndex];

    console.log("TCL: ------------------------");
    console.log("TCL: FIELD HAND", gameField.hand.cards.map(c => c.card?.name + " > " + c.gameObject.visible));
    console.log("TCL: DUEL HAND", duelField.hand.map(c => c?.name));

    // TODO IMPROVE THE LOOPS AND ARRAY CREATIONS
    const hand: Array<GameCardHand | null> = [];

    for (let i = 0; i < duelField.hand.length; ++i) {
      const cardZone = gameField.hand.getCardFromReference(duelField.hand[i]);
      hand[i] = cardZone;
    }

    gameField.hand.cards.forEach((card) => {
      if (card && !hand.includes(card)) {
        card.destroy();
      }
    });

    gameField.hand.cards = [];

    for (let i = 0; i < hand.length; ++i) {
      if (!hand[i]) {
        const card = new GameCardHand({ duel: this, player: playerIndex });
        card.setCard(duelField.hand[i]);
        gameField.hand.cards[i] = card;
      } else {
        gameField.hand.cards[i] = hand[i]!;
      }
      gameField.hand.cards[i].gameObject.visible = true;
      gameField.hand.cards[i].handIndex = i;
    }
  }

  public updateExtraDeck(playerIndex: number) {
    const gameField = this.fields[playerIndex];
    const duelField = this.ygo.state.fields[playerIndex];
    const extraDeck = gameField.extraDeck;
    const extraDeckCards: Array<GameCard | null> = [];

    // store cards in the array
    for (let i = 0; i < duelField.extraDeck.length; ++i) {
      const card = duelField.extraDeck[i];
      if (YGOGameUtils.isPendulumCard(card)) {
        extraDeckCards[i] = extraDeck.faceUpCards.find(c => c.cardReference === card) ?? null;
      }
    }

    // delete unused cards
    extraDeck.faceUpCards.forEach((card) => {
      if (card && !extraDeckCards.includes(card)) {
        card.destroy();
      }
    });

    // create cards missing
    for (let i = 0; i < duelField.extraDeck.length; ++i) {
      const card = duelField.extraDeck[i];
      if (YGOGameUtils.isPendulumCard(card)) {
        if (!extraDeckCards[i]) {
          extraDeckCards[i] = new GameCard({ card, duel: this, stats: false });
        }
      }
    }

    extraDeck.faceUpCards = extraDeckCards.reverse() as any;
    extraDeck.updateExtraDeck();
  }

  public renderHand(playerIndex: number) {
    const gameField = this.fields[playerIndex];
    gameField.hand.render();
  }

  // public updateHand(playerIndex: number) {

  //     for(let i = 0; i< )
  //     // const cardInitialProps = { duel: this };
  //     // const gameField = this.fields[playerIndex];
  //     // const duelField = this.ygo.state.fields[playerIndex];

  //     // const cardWidth = 3; // Width of each card
  //     // const cardSpacing = 2.2; // Space between cards
  //     // const totalCards = duelField.hand.length; // Total number of cards in hand

  //     // const handWidth = (totalCards - 1) * cardSpacing + cardWidth;
  //     // const handY = 6.8 * (playerIndex === 0 ? -1 : 1);
  //     // const handZ = 5;

  //     // for (let i = 0; i < totalCards; ++i) {
  //     //     if (!gameField.hand.cards[i]) {
  //     //         gameField.hand.cards.push(new GameCardHand(cardInitialProps));
  //     //     }

  //     //     gameField.hand.cards[i].handIndex = i;
  //     //     gameField.hand.cards[i].setCard(duelField.hand[i]);
  //     //     const xOffset = -handWidth / 2 + cardWidth / 2; // Start position to center
  //     //     gameField.hand.cards[i].gameObject.position.x = xOffset + i * cardSpacing;
  //     //     gameField.hand.cards[i].gameObject.position.y = handY;
  //     //     gameField.hand.cards[i].gameObject.position.z = handZ;
  //     //     gameField.hand.cards[i].gameObject.rotation.copy(YGOMath.degToRadEuler(0, 0, 0));
  //     //     const currentGameObject = gameField.hand.cards[i].gameObject;
  //     //     if (currentGameObject) currentGameObject.name = "CARD " + i;
  //     // }

  //     // for (let i = gameField.hand.cards.length - 1; i >= duelField.hand.length; --i) {
  //     //     this.destroy(gameField.hand.cards[i]);
  //     //     gameField.hand.cards.splice(i, 1);
  //     // }
  // }

  public renderField() {
    // only renders and updates cards
    for (let playerIndex = 0; playerIndex < this.fields.length; ++playerIndex) {
      const gameField = this.fields[playerIndex];

      for (let i = 0; i < gameField.monsterZone.length; ++i) {
        gameField.monsterZone[i].updateCard();
      }

      for (let i = 0; i < gameField.spellTrapZone.length; ++i) {
        gameField.spellTrapZone[i].updateCard();
      }

      gameField.fieldZone.updateCard();
      gameField.hand.render();
      gameField.mainDeck.updateDeck();
      gameField.extraDeck.updateExtraDeck();
    }

    for (let i = 0; i < 2; ++i) {
      this.fields[0].extraMonsterZone[i].updateCard();
    }

    this.events.dispatch("render-ui");
  }

  public update() {
    this.core.render();
    this.deltaTime = this.core.deltaTime;

    for (const entity of this.entities) {
      if (entity.enabled) {
        entity.update(this.deltaTime);
      }
    }
  }

  public add(entity: YGOEntity) {
    if (entity.gameObject) {
      this.core.scene.add(entity.gameObject);
    }

    this.entities.push(entity);
  }

  public destroy(entity: YGOEntity) {
    const uiElement: YGOUiElement = entity as any;

    if (uiElement.isUiElement) {
      this.gameController
        .getComponent<YGOMouseEvents>("mouse_events")
        ?.unregisterElement(uiElement);
    }

    if (entity.gameObject) {
      this.core.scene.remove(entity.gameObject);
    }

    const index = this.entities.findIndex((e) => e === entity);
    if (index >= 0) {
      this.entities.splice(index, 1);
    }
  }

  public getActivePlayer() {
    return this.currentPlayerIndex;
  }

  public setActivePlayer(player: number) {
    this.ygo.setCurrentPlayer(player);
  }

  public test() {
    // const trailRenderer = new TrailRenderer();

    // // Configure the trail
    // trailRenderer.setWidth(0.2);
    // trailRenderer.setMaxPoints(100);
    // trailRenderer.setFadeTime(0.25);
    // trailRenderer.setCamera(this.core.camera);
    // trailRenderer.setColor(0xff0000); // Red color

    // this.add(trailRenderer);

    // this.tasks.startTask(new YGOTaskSequence(
    //     new PositionTransition({
    //         gameObject: trailRenderer.gameObject,
    //         position: new THREE.Vector3(5, 5, 5),
    //         duration: 1
    //     }),
    //     new PositionTransition({
    //         gameObject: trailRenderer.gameObject,
    //         position: new THREE.Vector3(-5, 5, 5),
    //         duration: 1
    //     }),
    //     new PositionTransition({
    //         gameObject: trailRenderer.gameObject,
    //         position: new THREE.Vector3(-5, 0, 5),
    //         duration: 1
    //     }),
    //     new PositionTransition({
    //         gameObject: trailRenderer.gameObject,
    //         position: new THREE.Vector3(5, 0, 5),
    //         duration: 1
    //     }),
    //     new PositionTransition({
    //         gameObject: trailRenderer.gameObject,
    //         position: new THREE.Vector3(5, 5, 5),
    //         duration: 1
    //     }),
    //     new PositionTransition({
    //         gameObject: trailRenderer.gameObject,
    //         position: new THREE.Vector3(-5, 5, 5),
    //         duration: 1
    //     }),
    //     new PositionTransition({
    //         gameObject: trailRenderer.gameObject,
    //         position: new THREE.Vector3(-5, 0, 5),
    //         duration: 1
    //     }),
    //     new PositionTransition({
    //         gameObject: trailRenderer.gameObject,
    //         position: new THREE.Vector3(5, 0, 5),
    //         duration: 1
    //     }),
    //     new PositionTransition({
    //         gameObject: trailRenderer.gameObject,
    //         position: new THREE.Vector3(5, 5, 5),
    //         duration: 1
    //     }),
    //     new PositionTransition({
    //         gameObject: trailRenderer.gameObject,
    //         position: new THREE.Vector3(-5, 5, 5),
    //         duration: 1
    //     }),
    //     new PositionTransition({
    //         gameObject: trailRenderer.gameObject,
    //         position: new THREE.Vector3(-5, 0, 5),
    //         duration: 1
    //     }),
    //     new PositionTransition({
    //         gameObject: trailRenderer.gameObject,
    //         position: new THREE.Vector3(5, 0, 5),
    //         duration: 1
    //     }),

    // ))

    // const destroyEffect = this.assets.getPool("destroyEffect").get<YGOAnimationObject>();
    // this.add(destroyEffect);

    // destroyEffect.gameObject.position.set(0, 0, 1);
    // destroyEffect.gameObject.visible = true;
    // destroyEffect.playAll();
    // destroyEffect.enable();

    return;

    const modalGeometry = new THREE.PlaneGeometry(1, 1);
    const modalMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.8,
    });

    const modalPlane = new THREE.Mesh(modalGeometry, modalMaterial);
    modalPlane.scale.set(20, 20, 20);
    modalPlane.position.set(0, 0, 14);

    this.core.scene.add(modalPlane);

    const cardSelection = createCardSelectionGeometry(4, 5, 0.5);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff000,
      opacity: 0.8,
      transparent: true,
    });
    const planeWithHole = new THREE.Mesh(cardSelection, material);
    this.core.scene.add(planeWithHole);
    this.core.sceneOverlay.add(planeWithHole);
    this.core.enableRenderOverlay();
    planeWithHole.position.z = 0;

    // this.tasks.startTask(new PositionTransition({
    //     gameObject:
    // }))

    const card = new GameCard({
      card: this.ygo.getField(0).hand[0],
      duel: this,
    });

    const tempPos = this.fields[0].graveyard.gameObject.position.clone();
    tempPos.z = 2;

    card.gameObject.position.copy(tempPos);

    const div = document.createElement("div");
    div.style.position = "fixed";
    div.style.width = "50px";
    div.style.height = "50px";
    div.style.background = "rgba(0,0,255,0.5)";
    //div.style.transformOrigin = "center";

    document.body.appendChild(div);

    this.tasks.startTask(
      new YGOTaskSequence()
        .add(
          new PositionTransition({
            gameObject: card.gameObject,
            position: new THREE.Vector3(-10, 0, 1),
            duration: 2,
          })
        )
        .add(
          new PositionTransition({
            gameObject: card.gameObject,
            position: new THREE.Vector3(10, 5, 5),
            duration: 2,
          })
        )
        .add(
          new PositionTransition({
            gameObject: card.gameObject,
            position: new THREE.Vector3(-10, 5, -5),
            duration: 2,
          })
        )
    );

    setInterval(() => {
      const { x, y, width, height } = getTransformFromCamera(
        this,
        card.gameObject
      );

      div.style.left = `${x}px`; // Adjust to center
      div.style.top = `${y}px`; // Adjust to center
      div.style.width = `${width}px`;
      div.style.height = `${height}px`;
    }, 10);

    return;

    const pos1 = this.fields[0].hand.getCard(4)!.gameObject.position.clone();

    const pos2 = this.fields[0].monsterZone[3].position.clone();

    const pos3 = this.fields[0].monsterZone[3].position.clone();

    card.gameObject.position.copy(pos1);

    pos2.z += 6;

    this.tasks.startTask(
      new YGOTaskSequence()
        .add(
          new PositionTransition({
            gameObject: card.gameObject,
            position: pos1,
            duration: 0,
          })
        )
        .add(
          new PositionTransition({
            gameObject: card.gameObject,
            position: pos2,
            duration: 0.35,
          })
        )
        .add(
          new PositionTransition({
            gameObject: card.gameObject,
            position: pos3,
            duration: 0.25,
          })
        )
        .add(new WaitForSeconds(0.5))
        .add(
          new CallbackTransition(() => {
            alert("Done");
          })
        )
    );
  }

  getGameState() {
    return this.ygo.getCurrentStateProps();
  }

  execCommand(command: Command | string) {
    if (typeof command === "string") {
      this.ygo.exec(new JSONCommand(JSON.parse(command)));
    } else {
      this.ygo.exec(command);
    }
  }

  clearActions() {
    // clear any action open
    this.actionManager.clearAction();
    this.events.dispatch("clear-ui-action");
  }

  private setupVars() {
    document.documentElement.style.setProperty('--ygo-player-asset-ui-card-icons', `url('${this.config.cdnUrl}/images/ui/card_icons.png')`);
    document.documentElement.style.setProperty('--ygo-player-asset-ui-game-zones', `url('${this.config.cdnUrl}/images/ui/ic_game_zones.png')`);
  }

  public createCdnUrl(path: string) {
    return `${this.config.cdnUrl}${path}`;
  }

  public destroyDuelInstance() {
    try {
      this.gameController.destroyEntity();
    } catch (error) { }

    this.entities.forEach(entity => {
      try {
        entity.destroyEntity();
      } catch (error) { }
    });

    try {
      this.core.destroy();
    } catch (error) { }

    this.globalHotKeysManager?.clear();
  }
}
