import * as THREE from "three";
import { YGOPlayerCore } from "./YGOPlayerCore";
import { YGODuelState, YGOUiElement } from "../types";
import { YGOCore, YGOServerGameStateData, YGOGameUtils, YGOClientType, CardData, YGOCommandScope, YGOCommands, YGOPlayerRemoteActions, HIDDEN_CARD_ID, createHiddenCardData } from "ygo-core";
import { YGOEntity } from "./YGOEntity";
import { GameController } from "../game/GameController";
import { EventBus } from "../scripts/event-bus";
import { YGOMouseEvents } from "./components/YGOMouseEvents";
import { createFields } from "../scripts/ygo-utils";
import { PlayerField } from "../game/PlayerField";
import { GameCardHand } from "../game/GameCardHand";
import { ActionCardSelection } from "../actions/ActionSelectCard";
import { YGOActionManager } from "./components/YGOAction";
import { ActionCardHandMenu } from "../actions/ActionCardHandMenu";
import { ActionCardZoneMenu } from "../actions/ActionCardZoneMenu";
import { YGOTaskController } from "./components/tasks/YGOTaskController";
import { GameCard } from "../game/GameCard";
import { YGOCommandsController } from "./components/commands-controller/YGOCommandsController";
import { YGOAssets } from "./YGOAssets";
import { YGOGameActions } from "./YGOGameActions";
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
import { YGOClient } from "ygo-core";
import { PromiseTask } from "../scripts/promise-task";
import { YGOServerActions } from "./YGOServerActions";
import { YGOStatic } from "./YGOStatic";

export class YGODuel {
  public ygo!: InstanceType<typeof YGOCore>;
  public client: YGOClient;
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
  public serverActions: YGOServerActions;
  /** Set by YGOPlayerComponentImpl.bind() for connectToServer() only — see
   * YGOPlayerConnectToServerProps. undefined for editor/replay (no judge/
   * adapter to query) and for any player who never enabled assisted mode. */
  public assist?: { query(): Promise<any>; choose(action: { commandType: string; data: any }): Promise<any>; review?(): Promise<any> };
  /** The assisted options the panel last received (AssistedOptionsPanel keeps
   * it current) — card menus route a matching move through assist.choose. */
  public assistOptions: any = null;
  public gameController: GameController;
  public mouseEvents: YGOMouseEvents;
  public tasks: YGOTaskController;
  public commands: YGOCommandsController;
  public deltaTime: number = 0;
  public config: YGOConfig;
  public duelScene: YGODuelScene;
  public settings: YGOPlayerSettingsAdapter;
  public globalHotKeysManager: HotKeyManager;
  public isGameActive: boolean;
  public continuousAccept: boolean = false;
  private loadingTask: PromiseTask;

  constructor({
    canvas,
    client,
    config,
  }: {
    client: YGOClient,
    canvas: HTMLCanvasElement;
    config: YGOConfig;
  }) {
    this.state = YGODuelState.EDITOR;
    this.client = client;
    this.config = config;
    this.settings = new YGOPlayerSettingsAdapter();

    this.core = new YGOPlayerCore({ canvas });
    this.core.timeScale = this.settings.getGameSpeed();
    this.core.renderer.setAnimationLoop(this.update.bind(this));
    this.camera = this.core.camera;
    this.entities = [];
    this.fields = [];
    this.duelScene = new YGODuelScene(this);
    this.gameController = new GameController(this);
    this.actionManager = new YGOActionManager();
    this.serverActions = new YGOServerActions(this, this.client);
    this.tasks = new YGOTaskController(this);
    this.commands = new YGOCommandsController(this);
    this.soundController = new YGOSoundController();
    this.mouseEvents = new YGOMouseEvents(this);
    this.assets = new YGOAssets(this);
    this.events = new EventBus();
    this.isGameActive = true;
    this.globalHotKeysManager = this.createShortcuts();

    this.gameController.addComponent("mouse_events", this.mouseEvents);
    this.gameController.addComponent("sound_controller", this.soundController);
    this.gameController.addComponent("tasks", this.tasks);
    this.gameController.addComponent("commands", this.commands);
    this.gameController.addComponent("actions_manager", this.actionManager);
    this.gameController.addComponent("action_card_selection", new ActionCardSelection({ duel: this }));
    this.gameController.addComponent("attack_selection_action", new ActionAttackSelection(this));
    this.gameController.addComponent("map-click-zone", new YGOMapClick(this));
    this.gameController.addComponent("server_actions", this.serverActions);
    this.actionManager.actions.set("card-hand-menu", new ActionCardHandMenu(this));
    this.actionManager.actions.set("card-zone-menu", new ActionCardZoneMenu(this));
    this.gameActions = new YGOGameActions(this);
    this.loadingTask = new PromiseTask();
    this.loadingTask.registerTask(); // create ygo Task
    this.loadingTask.registerTask(); // loading assets task

    this.soundController.addLayer({ name: "GAME", volume: this.settings.getGameVolume() });
    this.soundController.addLayer({ name: "GAME_MUSIC", volume: this.settings.getMusicVolume(), useTimeScale: false });

    this.setupVars();

    this.core.events.on("on-timescale-change", (timeScale: number) => this.soundController.setTimeScale(timeScale));
    //this.ygo = new YGOCore(this.config);

    (window as any).YGODuel = this;

    this.serverActions.server.getGameState();
  }

  public async createYGO(gameState: YGOServerGameStateData) {
    const ids = new Set<number>()
    let playerIndex = gameState.players.findIndex(c => c.name === this.client.username);

    if (this.client.type === YGOClientType.PLAYER && playerIndex === -1) {
      playerIndex = 0;
    }

    const otherPlayerIndex = playerIndex >= 0 ? 1 - playerIndex : 1;

    gameState.players.map((player) => {
      player.mainDeck.forEach(id => ids.add(id));
      player.extraDeck.forEach(id => ids.add(id));
      player.sideDeck?.forEach(id => ids.add(id));
    })

    // Hidden information: the server sends the cards this client may not see
    // as HIDDEN_CARD_ID placeholders, and the data of the opponent's cards
    // revealed so far (hiddenInfo.cards) — later reveals come with each command.
    ids.delete(HIDDEN_CARD_ID);
    const revealedCards = gameState.hiddenInfo?.cards ?? [];
    revealedCards.forEach(card => ids.delete(card.id));

    const cardsData = new Map<number, CardData>();
    cardsData.set(HIDDEN_CARD_ID, createHiddenCardData());
    revealedCards.forEach(card => cardsData.set(card.id, card));

    if (this.config.actions?.fetchCardsById) {
      const cardsDataArray = await this.config.actions.fetchCardsById(Array.from(ids));
      cardsDataArray.map(c => cardsData.set(c.id, c));
    } else {
      const cardsResponse = await fetch(`https://api.ygo101.com/cards?ids=${Array.from(ids).join(",")}`);
      const cardsDataArray = await cardsResponse.json() as CardData[];
      cardsDataArray.map(c => cardsData.set(c.id, c));
    }

    const players = gameState.players.map((player) => {
      return {
        name: player.name,
        mainDeck: player.mainDeck.map(id => cardsData.get(id)!),
        extraDeck: player.extraDeck.map(id => cardsData.get(id)!),
        sideDeck: player.sideDeck?.map(id => cardsData.get(id)!) || [],
      }
    })
    const props = gameState.ygoCoreProps;
    const options = props.options || {};
    options.shuffleDecks = false;

    this.ygo = new YGOCore({
      players,
      cdnUrl: this.config.cdnUrl,
      commands: props.commands,
      options,
      cardPool: revealedCards,
    })

    YGOStatic.playerIndex = playerIndex;
    YGOStatic.otherPlayerIndex = otherPlayerIndex;
    YGOStatic.playerPOV = Number(this.ygo.options.playerPOV) >= 0 ? Number(this.ygo.options.playerPOV) : playerIndex >= 0 ? playerIndex : 0;

    const cardsAreVisible = (this.client.type === YGOClientType.PLAYER && this.ygo.options.viewOpponentCards)
      || (this.client.type === YGOClientType.SPECTATOR && this.ygo.options.spectatorViewCards);

    this.config.options.showCards = cardsAreVisible;
    this.config.autoChangePlayer = cardsAreVisible;

    this.ygo.events.on("new-log", (evenlLog: any) => {
      if (this.commands.isRecovering()) return;
      // console.log("-------------- command ------------");
      // console.log("command >>> ", command);

      this.events.dispatch("render-ui");
      this.commands.processYGOLog(evenlLog);
    });

    this.ygo.events.on("update-logs", (data: any) => {
      this.events.dispatch("logs-updated", data);
    });

    this.ygo.events.on("set-duel-turn", (data: any) => {
      this.continuousAccept = false;
      this.events.dispatch("render-ui");
    });

    this.ygo.events.on("set-duel-turn-priority", (data: any) => {
      this.events.dispatch("render-ui");
      if (this.continuousAccept) {
        const localPlayer = YGOStatic.playerIndex;
        if (localPlayer >= 0 && this.ygo.state.turnPriority === localPlayer) {
          this.passPriority();
        }
      }
    });

    this.ygo.events.on("player-remote-action", remoteData => {
      this.serverActions.ygo.setPlayerRemoteAction(remoteData);
    })

    this.events.on("enable-game-actions", () => {
      if (!this.isGameActive) return;
      this.actionManager.actionsEnabled = true;
    });

    this.events.on("disable-game-actions", () => {
      this.actionManager.clearAction();
      this.actionManager.actionsEnabled = false;
    });

    this.loadingTask.completeTask();
  }

  public async load() {
    try {
      await Promise.all([
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
          `${this.config.cdnUrl}/images/ui/ic_xyz_materials128.png`,
          `${this.config.cdnUrl}/images/sprites/atlas_1.png`,
        ),
        this.soundController.loadSounds(
          this.createCdnUrl("/sounds/card-place-1.ogg"),
          this.createCdnUrl("/sounds/card-place-2.ogg"),
          this.createCdnUrl("/sounds/card-place-3.ogg")
        ),
      ]);

      this.loadingTask.completeTask();

      await this.loadingTask.wait(); // wait for server events and download cards

      const fieldModel = this.assets.models.get(`${this.config.cdnUrl}/models/field.glb`)!;
      const gameFieldScene = this.assets.models.get(`${this.config.cdnUrl}/models/game_field.glb`)!;
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

      this.core.updateCamera();

      this.updateField();

      this.serverActions.server.setClientReady();
    } catch (error) {
      console.error("YGODuel.load failed:", error);
    }
  }

  // @deprecated
  public startDuel() {

  }

  public updateField() {
    for (let playerIndex = 0; playerIndex < this.fields.length; ++playerIndex) {
      const gameField = this.fields[playerIndex];
      const duelField = this.ygo.state.fields[playerIndex];
      // A reconnect can fire a queued server:exec render before this.ygo.state
      // has been fully rehydrated — state.fields is briefly shorter than
      // this.fields in that window. Skip this tick rather than throw; the
      // next update (moments later, once state catches up) renders correctly.
      if (!duelField) continue;

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

    const field0 = this.ygo.state.fields[0];
    const field1 = this.ygo.state.fields[1];
    // this.fields is the client-side render array (populated once load()
    // finishes creating GameFields) — it can still be empty even once
    // ygo.state.fields (server state) exists, on the same reconnect race.
    if (field0 && field1 && this.fields[0] && this.fields[1]) {
      for (let i = 0; i < 2; ++i) {
        const player = field0.extraMonsterZone[i] ? 0 : field1.extraMonsterZone[i] ? 1 : 0;
        const cardFromPlayer = field0.extraMonsterZone[i] ?? field1.extraMonsterZone[i];
        const cardZone = this.fields[player].extraMonsterZone[i];
        cardZone.setCard(cardFromPlayer);
      }
    }

    this.renderField();
    // Same reconnect race as this.fields above — fieldStats is only
    // assigned once load() reaches that point, and a queued server:exec
    // render can fire updateField() before then.
    this.fieldStats?.update();
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
    // Only Pendulum monsters get a face-up GameCard here (non-Pendulum
    // extra deck cards are represented by the face-down pile instead) —
    // built by pushing rather than indexing by `i` into duelField.extraDeck
    // so this array never ends up with holes for the skipped non-Pendulum
    // slots. A hole (sparse-array `undefined`) crashes ExtraDeck.
    // updateExtraDeck()'s plain `for` loop over faceUpCards as soon as any
    // extra deck mixes Pendulum and non-Pendulum monsters.
    const pendulumCards = duelField.extraDeck.filter(card => YGOGameUtils.isPendulumCard(card));
    const extraDeckCards: Array<GameCard | null> = pendulumCards.map(
      card => extraDeck.faceUpCards.find(c => c.cardReference === card) ?? null,
    );

    // delete unused cards
    extraDeck.faceUpCards.forEach((card) => {
      if (card && !extraDeckCards.includes(card)) {
        card.destroy();
      }
    });

    // create cards missing
    for (let i = 0; i < pendulumCards.length; ++i) {
      if (!extraDeckCards[i]) {
        extraDeckCards[i] = new GameCard({ card: pendulumCards[i], duel: this, stats: false });
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

    if (this.fields[0]) {
      for (let i = 0; i < 2; ++i) {
        this.fields[0].extraMonsterZone[i].updateCard();
      }
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
    return this.ygo.state.turnPriority;
  }

  public passPriority() {
    if (this.ygo?.state.turnPriority === YGOStatic.playerIndex) {
      this.serverActions.ygo.exec({
        command: new YGOCommands.PlayerPriorityCommand({ player: 1 - YGOStatic.playerIndex }),
      });
    }
    this.serverActions.ygo.sendPlayerAction({ action: YGOPlayerRemoteActions.OK });
  }

  public setActivePlayer(player: number) {
    if (this.ygo.options.controlOpponentCards) {
      this.serverActions.ygo.setPlayerPriority(player);
    } else {
      this.serverActions.ygo.setPlayerPriority(YGOStatic.playerIndex);
    }
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
    }, {
      keys: "k",
      action: "passPriority"
    }]);

    this.globalHotKeysManager.on("passPriority", () => {
      this.passPriority();
    });

    this.globalHotKeysManager.on("toggleControls", () => {
      this.events.dispatch("toggle-ui-menu", { group: "game-overlay", type: "controls-menu" });
    });

    this.globalHotKeysManager.on("toggleDuelLogs", () => {
      this.events.dispatch("toggle-ui-menu", { group: "game-overlay", type: "duel-log" });
    });

    this.globalHotKeysManager.on("previousCommand", () => {
      this.serverActions.controls.previousCommand();
    });

    this.globalHotKeysManager.on("nextCommand", () => {
      this.serverActions.controls.nextCommand();
    });

    this.globalHotKeysManager.on("space", () => {
      if (this.commands.isPlaying()) {
        this.serverActions.controls.pause();
      } else {
        this.serverActions.controls.play();
      }
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

  /**
   * The duel's replay. With server-side hidden information this client only
   * holds its own view (the opponent's cards are placeholders), so the full
   * replay comes from the server — which hands it out once the match is over.
   */
  async getReplayData(): Promise<any> {
    if (this.ygo.options.hiddenInfoClient) {
      return this.serverActions.server.requestReplay();
    }
    return this.ygo.getReplayData();
  }

  execCommand(command: Command | string) {
    if (this.ygo.options.controlTogglePriority === false) {
      if (typeof command === "object"
        && command.scope === YGOCommandScope.GAME
        && command.type !== "Duel Turn"
        && command.type !== "Duel Phase"
      ) {
        this.serverActions.ygo.exec({ command: new YGOCommands.PlayerPriorityCommand({ player: YGOStatic.playerIndex }) });
      }
    }
    this.serverActions.ygo.exec({ command })
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

    // Its middle-mouse listeners live on window, not the torn-down canvas.
    this.fieldStats?.destroy();

    this.entities.forEach(entity => {
      try {
        entity.destroyEntity();
      } catch (error) { }
    });

    try {
      this.core.destroy();
    } catch (error) { }

    this.globalHotKeysManager?.clear();

    if ((window as any).YGODuel === this) (window as any).YGODuel = undefined;

    // Do NOT call this.client.disconnect() here. For connectToServer() sessions,
    // `client` is the app's long-lived socket wrapper, reused across multiple
    // duels in the same tab (rematch / start-another-AI-duel without a reload).
    // YGOSocketClient/YGONativeWSClient's disconnect() permanently unregisters
    // their onAny/frame forwarding listener from the underlying socket/comm —
    // nothing ever re-registers it, so every subsequent duel on that same
    // client would silently stop receiving any server message, hanging forever
    // with no error. The client's real lifecycle (actually leaving the duel
    // page) is owned by the caller (e.g. DuelFeature's own cleanup), not by a
    // single duel instance being torn down.
  }

  public endDuel() {
    this.isGameActive = false;
    this.actionManager.actionsEnabled = false;
  }
}
