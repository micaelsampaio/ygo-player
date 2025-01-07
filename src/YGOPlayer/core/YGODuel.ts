import * as THREE from 'three';
import { YGOPlayerCore } from './YGOPlayerCore';
import { GameFieldLocation, YGOUiElement } from '../types';
import { YGOCommands, YGOCore } from '../../YGOCore';
import { YGOEntity } from './YGOEntity';
import { GameController } from '../game/GameController';
import { EventBus } from '../scripts/event-bus';
import { YGOMouseEvents } from './components/YGOMouseEvents';
import { createFields } from '../scripts/ygo-utils';
import { PlayerField } from '../game/PlayerField';
import { YGOMath } from './YGOMath';
import { GameCardHand } from '../game/GameCardHand';
import { ActionCardSelection } from '../actions/ActionSelectCard';
import { YGOActionManager as ActionManager } from './components/YGOAction';
import { ActionCardHandMenu } from '../actions/ActionCardHandMenu';
import { ActionCardZoneMenu } from '../actions/ActionCardZoneMenu';
import { YGOTaskManager } from './components/YGOTaskManager';
import YUBEL from '../../decks/YUBEL.json';
import CHIMERA from '../../decks/CHIMERA.json';

export class YGODuel {
    public core: YGOPlayerCore;
    public fields: PlayerField[];
    public ygo!: YGOCore;
    public fieldLocations!: Map<string, GameFieldLocation>;
    public camera: THREE.PerspectiveCamera;
    public entities: YGOEntity[];
    public events: EventBus<any>;
    public actionManager: ActionManager;
    public gameController: GameController;
    public mouseEvents: YGOMouseEvents;
    public tasks: YGOTaskManager;
    private currentPlayerIndex = 0;

    constructor({ canvas }: any) {
        this.core = new YGOPlayerCore({ canvas });
        this.core.renderer.setAnimationLoop(this.update.bind(this));
        this.camera = this.core.camera;
        this.entities = [];
        this.fields = [];
        this.gameController = new GameController(this);
        this.actionManager = new ActionManager();
        this.tasks = new YGOTaskManager();
        this.mouseEvents = new YGOMouseEvents(this);
        this.events = new EventBus();

        (window as any).YGODuel = this;

        console.log(YGOCommands);
        console.dir(YGOCommands);
    }

    async load() {
        try {
            const [fieldModel] = await Promise.all([
                this.core.loadGLTFAsync(`http://127.0.0.1:8080/models/field.glb`)
            ]);

            this.core.scene.add(fieldModel.scene);
            this.core.camera.position.set(0, 15, 0);
            this.core.camera.lookAt(0, 0, 0);
            this.gameController.addComponent("mouse_events", this.mouseEvents);
            this.gameController.addComponent("tasks", this.tasks)
            this.fields = createFields({ duel: this, fieldModel: fieldModel.scene });
            this.gameController.addComponent("action_card_selection", new ActionCardSelection({ duel: this }));
            this.entities.push(this.gameController);

            this.createActions();

            this.events.on("normal-summon", ({ player, cb }: any) => {
                this.fields[player].monsterZone.forEach((cardZone) => {
                    // TODO
                    cardZone.onClickCb = () => {
                        console.log(cardZone.zone);
                        cb(cardZone.zone);
                        this.fields[player].monsterZone.forEach(cardZone2 => cardZone2.onClickCb = null);
                    }
                });
            });
            this.events.on("set-monster", ({ player, cb }: any) => {
                this.fields[player].monsterZone.forEach((cardZone) => {
                    // TODO
                    cardZone.onClickCb = () => {
                        console.log(cardZone.zone);
                        cb(cardZone.zone);
                        this.fields[player].monsterZone.forEach(cardZone2 => cardZone2.onClickCb = null);
                    }
                });
            });
            this.events.on("set-card", ({ player, cb }: any) => {
                this.fields[player].spellTrapZone.forEach((cardZone) => {
                    // TODO
                    cardZone.onClickCb = () => {
                        console.log(cardZone.zone);
                        cb(cardZone.zone);
                        this.fields[player].spellTrapZone.forEach(cardZone2 => cardZone2.onClickCb = null);
                    }
                });
            });

            // const geometry = new THREE.BoxGeometry(3, 3 * 1.45, 0.05);
            // const material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
            // const cube = new THREE.Mesh(geometry, material);
            // cube.position.copy(this.fieldLocations.get("Hand")!.position);
            // cube.rotation.copy(this.fieldLocations.get("Hand")!.rotation);
            // this.core.scene.add(cube);

            // const cube2 = new THREE.Mesh(geometry, material);
            // cube2.position.copy(this.fieldLocations.get("Hand2")!.position);
            // cube2.rotation.copy(this.fieldLocations.get("Hand2")!.rotation);
            // this.core.scene.add(cube2);

        } catch (error) {
            console.error("ERROR:");
            console.error(error);
            alert("ERROR")
        }
    }

    private createActions() {
        this.actionManager.actions.set("card-hand-menu", new ActionCardHandMenu(this));
        this.actionManager.actions.set("card-zone-menu", new ActionCardZoneMenu(this));
    }

    public startDuel() {
        const deck1 = JSON.parse(JSON.stringify(YUBEL));
        const deck2 = JSON.parse(JSON.stringify(CHIMERA));
        
        this.ygo = new YGOCore({
            players: [{
                name: 'Player 1',
                mainDeck: deck1.mainDeck as any,
                extraDeck: deck1.extraDeck as any,
            },
            {
                name: 'Player 2',
                mainDeck: deck2.mainDeck as any,
                extraDeck: deck2.extraDeck as any,
            }],
            // options: {
            //     fieldState: [
            //         [
            //             { id: 62318994, zone: "M-1" }, // lotus
            //             { id: 90829280, zone: "M-2" }, // spirit of yubel
            //             { id: 14558127, zone: "H-3" }, // Ash blossom
            //             { id: 80312545, zone: "H-4" }, // Spirt gates
            //             { id: 10045474, zone: "H-5" }, // imperm,

            //             // { id: 62318994, zone: "H-6" }, // lotus
            //             // { id: 90829280, zone: "H-7" }, // spirit of yubel
            //             // { id: 14558127, zone: "H-8" }, // Ash blossom
            //             // { id: 80312545, zone: "H-9" }, // Spirt gates
            //             // { id: 10045474, zone: "H-10" }, // imperm,

            //             // { id: 27439792, zone: "H-11" }, // imperm,
            //             // { id: 81034083, zone: "H-12" }, // imperm,
            //             // { id: 81034083, zone: "H-13" }, // imperm,
            //         ]
            //     ]
            // }
        });

        setTimeout(() => {
            this.ygo.start();
            this.updateField();
        }); // next fram call


        // this.ygo.duelLog.events.on("new", (log) => {
        // Animation V1

        //     if (log.type === "Normal Summon" ||
        //         log.type === "Special Summon" ||
        //         log.type === "Set Monster" 
        //     ) {
        //         const ygo = this.ygo;
        //         const duel = this;
        //         const normalSummonGenerator = function* () {
        //             const gameZoneIndex = Number(log.data.zone.split("-")[1]) - 1;
        //             const originZoneIndex = Number(log.data.originZone.split("-")[1]) - 1;
        //             const card = ygo.state.fields[log.player].monsterZone[gameZoneIndex]!;
        //             const zone = duel.fields[log.player].monsterZone[gameZoneIndex];
        //             const handCard = duel.fields[log.player].hand.cards[originZoneIndex];
        //             const startPosition = handCard.gameObject.position.clone();
        //             const endPosition = zone.position.clone();

        //             const gameCard = new GameCard({
        //                 duel,
        //                 card
        //             });

        //             //duel.fields[log.player].hand.cards[originZoneIndex].destroy();
        //             const { rotation } = zone.getCardPositionAndRotation(card);
        //             gameCard.gameObject.rotation.copy(rotation);

        //             let startTime = Date.now();

        //             while (Date.now() - startTime < 250) {
        //                 let time = (Date.now() - startTime) / 250;

        //                 const pos = startPosition.clone().lerpVectors(startPosition, endPosition, time);

        //                 // const arcHeight = 5;
        //                 // const arcProgress = Math.sin(time * Math.PI);
        //                 // pos.y += arcHeight * arcProgress;

        //                 gameCard.gameObject.position.copy(pos);

        //                 yield null;
        //             }

        //             zone.setCard(gameCard);
        //             zone.reconcileCardWithState(card);
        //             duel.updateField();
        //         };

        //         this.tasks.setCommandTask(normalSummonGenerator());
        //     } else {
        //         this.updateField();
        //     }

        //     this.events.publish("logs-updated", this.ygo.duelLog.entries);
        // });
        this.ygo.duelLog.events.on("new-log", (log) => {
            console.log("--- NEW LOG ---");
            console.log(log);
        })
        this.ygo.duelLog.events.on("update-logs", (data) => {
            this.events.publish("logs-updated", data);
            this.updateField();
        });
    }

    public updateField() {

        const cardInitialProps = { duel: this };

        for (let playerIndex = 0; playerIndex < this.fields.length; ++playerIndex) {
            const gameField = this.fields[playerIndex];
            const duelField = this.ygo.state.fields[playerIndex];

            for (let i = 0; i < gameField.monsterZone.length; ++i) {
                const cardZone = gameField.monsterZone[i];
                const card = duelField.monsterZone[i];
                cardZone.reconcileCardWithState(card);
            }

            for (let i = 0; i < gameField.spellTrapZone.length; ++i) {
                const cardZone = gameField.spellTrapZone[i];
                const card = duelField.spellTrapZone[i];
                cardZone.reconcileCardWithState(card);
            }

            for (let i = 0; i < gameField.extraMonsterZone.length; ++i) {
                const cardZone = gameField.extraMonsterZone[i];
                const card = duelField.extraMonsterZone[i];
                cardZone.reconcileCardWithState(card);
            }

            for (let i = 0; i < gameField.hand.cards.length; ++i) {
                if (duelField.hand[i]) {
                    gameField.hand.cards[i].setCard(duelField.hand[i]);
                } else {
                    gameField.hand.cards[i].card = null as any;
                }
            }

            const cardWidth = 3; // Width of each card
            const cardSpacing = 2.2; // Space between cards
            const totalCards = duelField.hand.length; // Total number of cards in hand

            const handWidth = (totalCards - 1) * cardSpacing + cardWidth;
            const handY = 5;
            const handZ = 6.8 * (playerIndex === 0 ? 1 : -1);

            for (let i = 0; i < totalCards; ++i) {
                if (!gameField.hand.cards[i]) {
                    gameField.hand.cards.push(new GameCardHand(cardInitialProps));
                }

                gameField.hand.cards[i].handIndex = i;
                gameField.hand.cards[i].setCard(duelField.hand[i]);
                const xOffset = -handWidth / 2 + cardWidth / 2; // Start position to center
                gameField.hand.cards[i].gameObject.position.x = xOffset + i * cardSpacing;
                gameField.hand.cards[i].gameObject.position.y = handY;
                gameField.hand.cards[i].gameObject.position.z = handZ;
                gameField.hand.cards[i].gameObject.rotation.copy(YGOMath.degToRadEuler(270, 0, 0));
                const currentGameObject = gameField.hand.cards[i].gameObject;
                if (currentGameObject) currentGameObject.name = "CARD " + i;
            }

            for (let i = gameField.hand.cards.length - 1; i >= duelField.hand.length; --i) {
                this.destroy(gameField.hand.cards[i]);
                gameField.hand.cards.splice(i, 1);
            }
        }

        this.events.publish("render-ui");
    }

    public update() {
        this.core.render();

        for (const entity of this.entities) {
            entity.update(0);
        }
    }

    public add(entity: YGOEntity) {
        if (entity.gameObject) {
            this.core.scene.add(entity.gameObject)
        }
    }

    public destroy(entity: YGOEntity) {
        const uiElement: YGOUiElement = entity as any;

        if (uiElement.isUiElement) {
            this.gameController.getComponent<YGOMouseEvents>("mouse_events")?.unregisterElement(uiElement);
        }

        if (entity.gameObject) {
            this.core.scene.remove(entity.gameObject);
        }
    }

    public getActivePlayer() {
        return this.currentPlayerIndex;
    }
}