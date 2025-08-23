import * as THREE from "three";
import { YGOPlayerCore } from "./YGOPlayerCore";
import { YGODuelState, YGOUiElement } from "../types";
import { JSONCommand, YGOCommands, YGOCore, YGODuelPhase, YGOGameUtils } from "ygo-core";
import { YGOEntity } from "./YGOEntity";
import { GameController } from "../game/GameController";
import { EventBus } from "../scripts/event-bus";
import { YGOMouseEvents } from "./components/YGOMouseEvents";
import { createFields, getTransformFromCamera } from "../scripts/ygo-utils";
import { PlayerField } from "../game/PlayerField";
import { GameCardHand } from "../game/GameCardHand";
import { ActionCardSelection } from "../actions/ActionSelectCard";
import { YGOActionManager } from "./components/YGOAction";
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
import { SETTINGS_MODAL_TYPE } from "../ui/menus/game-settings/game-settings-menu";
import { BattlePhaseController } from "../actions/BattlePhaseController";
import { ActionAttackSelection } from "../actions/ActionAttackSelection";

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
  public actionManager: YGOActionManager;
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
    this.actionManager = new YGOActionManager();
    this.tasks = new YGOTaskController(this);
    this.commands = new YGOCommandsController(this);
    this.soundController = new YGOSoundController();
    this.mouseEvents = new YGOMouseEvents(this);
    this.assets = new YGOAssets(this);
    this.events = new EventBus();
    this.globalHotKeysManager = this.createShortcuts();

    this.gameController.addComponent("mouse_events", this.mouseEvents);
    this.gameController.addComponent("sound_controller", this.soundController);
    this.gameController.addComponent("tasks", this.tasks);
    this.gameController.addComponent("commands", this.commands);
    this.gameController.addComponent("actions_manager", this.actionManager);
    this.gameController.addComponent("action_card_selection", new ActionCardSelection({ duel: this }));
    this.gameController.addComponent("attack_selection_action", new ActionAttackSelection(this));
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

      this.fields = createFields({ duel: this, fieldModel: fieldModel.scene as any });
      this.fieldStats = new YGOGameFieldStatsComponent(this);
      this.entities.push(this.gameController);
      this.duelScene.createFields({ gameField: gameFieldScene.scene as any });
      this.duelScene.createGameMusic();
      this.gameController.getComponent<ActionCardSelection>("action_card_selection").createCardSelections();
      this.gameController.getComponent<ActionAttackSelection>("attack_selection_action").create();
      this.gameController.addComponent("battle_phase_controller", new BattlePhaseController("battle_phase_controller", this));

      this.settings.events.on("onShowCardWhenPlayedChange", (_, showTransparentCards) => {
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

      this.ygo.events.on("set-duel-turn", () => {

      })

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

        if (this.config.gameMode === "REPLAY") {
          this.events.dispatch("toggle-ui-menu", { group: "game-overlay", type: "controls-menu" });
        }

        setTimeout(() => {
          this.ygo.start();
        }, 500);

        // setTimeout(() => {
        //   this.execCommand(new YGOCommands.DuelPhaseCommand({ phase: YGODuelPhase.Battle }))
        // }, 1000);

        this.updateField();

        for (const field of this.fields) {
          field.hand.destroyAllCards();
        }

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

  private createShortcuts() {
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
      keys: "Space",
      action: "space"
    }, {
      keys: "Escape",
      action: "escPressed"
    }, {
      keys: "Shift+P",
      action: "shortcuts"
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

    this.globalHotKeysManager.on("space", () => {
      if (this.commands.isPlaying()) this.commands.pause();
      else this.commands.play();
    });

    this.globalHotKeysManager.on("escPressed", () => {
      this.events.dispatch("toggle-ui-menu", { group: "game-overlay", type: "settings-menu", data: { currentMenu: SETTINGS_MODAL_TYPE.SETTINGS } });
    });

    this.globalHotKeysManager.on("shortcuts", () => {
      this.events.dispatch("set-ui-menu", { group: "game-overlay", type: "settings-menu", data: { currentMenu: SETTINGS_MODAL_TYPE.CONTROLS } });
    })

    return this.globalHotKeysManager;
  }

  getGameState() {
    return this.ygo.getCurrentStateProps();
  }

  execCommand(command: Command | string) {
    this.commands.exec(command);
  }

  clearActions() {
    // clear any action open
    this.actionManager.clearAction();
    this.events.dispatch("clear-ui-action");
  }

  private setupVars() {
    document.documentElement.style.setProperty('--ygo-player-asset-ui-card-icons', `url('${this.config.cdnUrl}/images/ui/card_icons.png')`);
    document.documentElement.style.setProperty('--ygo-player-asset-ui-game-zones', `url('${this.config.cdnUrl}/images/ui/ic_game_zones.png')`);
    document.documentElement.style.setProperty('--ygo-player-asset-ui-logo', `url('${this.config.cdnUrl}/images/logo_dark.png')`);
    document.documentElement.style.setProperty('--ygo-player-asset-ui-logo-white', `url('${this.config.cdnUrl}/images/logo_white.png')`);
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
