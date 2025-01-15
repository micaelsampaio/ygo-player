import * as THREE from 'three';
import { YGOPlayerCore } from './YGOPlayerCore';
import { GameFieldLocation, YGOUiElement } from '../types';
import { YGOCore } from '../../YGOCore';
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
import { YGOTaskController } from './components/tasks/YGOTaskController';
import YUBEL from '../../decks/YUBEL.json';
import CHIMERA from '../../decks/CHIMERA.json';
import { GameCard } from '../game/GameCard';
import { PositionTransition } from '../duel-events/utils/position-transition';
import { YGOTaskSequence } from './components/tasks/YGOTaskSequence';
import { WaitForSeconds } from '../duel-events/utils/wait-for-seconds';
import { CallbackTransition } from '../duel-events/utils/callback';
import { handleDuelEvent } from '../duel-events';

export class YGODuel {
    public core: YGOPlayerCore;
    public fields: PlayerField[];
    public ygo!: YGOCore;
    public fieldLocations!: Map<string, GameFieldLocation>;
    public camera: THREE.Camera;
    public entities: YGOEntity[];
    public events: EventBus<any>;
    public actionManager: ActionManager;
    public gameController: GameController;
    public mouseEvents: YGOMouseEvents;
    public tasks: YGOTaskController;
    public deltaTime: number = 0;
    private currentPlayerIndex = 0;

    constructor({ canvas }: any) {
        this.core = new YGOPlayerCore({ canvas });
        this.core.renderer.setAnimationLoop(this.update.bind(this));
        this.camera = this.core.camera;
        this.entities = [];
        this.fields = [];
        this.gameController = new GameController(this);
        this.actionManager = new ActionManager();
        this.tasks = new YGOTaskController(this);
        this.mouseEvents = new YGOMouseEvents(this);
        this.events = new EventBus();

        (window as any).YGODuel = this;
    }

    async load() {
        try {
            const [fieldModel] = await Promise.all([
                this.core.loadGLTFAsync(`http://127.0.0.1:8080/models/field.glb`)
            ]);
            this.core.scene.add(fieldModel.scene);
            this.core.camera.position.set(0, 0, 15);
            //this.core.camera.position.set(0, -10, 15);
            //this.core.camera.lookAt(0, 5, 0);
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

            setTimeout(() => {
                this.test();
            }, 500);
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
            options: {
                fieldState: [
                    [
                        { id: 62318994, zone: "M-1" }, // lotus
                        { id: 90829280, zone: "M-2" }, // spirit of yubel
                    ]
                ]
            }
        });

        setTimeout(() => {
            this.ygo.start();
            this.updateField();
        }); // next fram call


        this.ygo.duelLog.events.on("new-log", (event) => {
            console.log("--- NEW LOG ---");
            console.log(event);
            this.events.publish("render-ui");
            handleDuelEvent(this, event);
        })

        this.ygo.duelLog.events.on("update-logs", (data) => {
            // TODO THIS
            this.events.publish("logs-updated", data);
            //this.updateField();
        });

        this.events.on("enable-game-actions", () => {
            this.actionManager.enabled = true;
        });

        this.events.on("disable-game-actions", () => {
            this.actionManager.clearAction();
            this.actionManager.enabled = false;
        });
    }

    public updateField() {
        console.log("PROCESS: UPDATE FIELD::")

        for (let playerIndex = 0; playerIndex < this.fields.length; ++playerIndex) {
            const gameField = this.fields[playerIndex];
            const duelField = this.ygo.state.fields[playerIndex];

            for (let i = 0; i < gameField.monsterZone.length; ++i) {
                const cardZone = gameField.monsterZone[i];
                const card = duelField.monsterZone[i];
                cardZone.setCard(card);
                cardZone.updateCard();
            }

            for (let i = 0; i < gameField.spellTrapZone.length; ++i) {
                const cardZone = gameField.spellTrapZone[i];
                const card = duelField.spellTrapZone[i];
                cardZone.setCard(card);
                cardZone.updateCard();
            }

            for (let i = 0; i < gameField.extraMonsterZone.length; ++i) {
                const cardZone = gameField.extraMonsterZone[i];
                const card = duelField.extraMonsterZone[i];
                cardZone.setCard(card);
                cardZone.updateCard();
            }

            for (let i = 0; i < gameField.hand.cards.length; ++i) {
                if (duelField.hand[i]) {
                    gameField.hand.cards[i].setCard(duelField.hand[i]);
                } else {
                    gameField.hand.cards[i].card = null as any;
                }
            }

            this.updateHand(playerIndex);
        }

        this.events.publish("render-ui");
    }

    public updateHand(playerIndex: number) {
        const cardInitialProps = { duel: this };
        const gameField = this.fields[playerIndex];
        const duelField = this.ygo.state.fields[playerIndex];

        const cardWidth = 3; // Width of each card
        const cardSpacing = 2.2; // Space between cards
        const totalCards = duelField.hand.length; // Total number of cards in hand

        const handWidth = (totalCards - 1) * cardSpacing + cardWidth;
        const handY = 6.8 * (playerIndex === 0 ? -1 : 1);
        const handZ = 5;

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
            gameField.hand.cards[i].gameObject.rotation.copy(YGOMath.degToRadEuler(0, 0, 0));
            const currentGameObject = gameField.hand.cards[i].gameObject;
            if (currentGameObject) currentGameObject.name = "CARD " + i;
        }

        for (let i = gameField.hand.cards.length - 1; i >= duelField.hand.length; --i) {
            this.destroy(gameField.hand.cards[i]);
            gameField.hand.cards.splice(i, 1);
        }
    }

    public update() {
        this.core.render();
        this.deltaTime = this.core.deltaTime;

        for (const entity of this.entities) {
            entity.update(this.deltaTime);
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

    public test() {
        return;

        const card = new GameCard({ card: this.ygo.getField(0).hand[0], duel: this });
        const tempPos = this.fields[0].graveyard.gameObject.position.clone();
        tempPos.z += 1;

        card.gameObject.position.copy(tempPos);




        const pos1 = this.fields[0].hand.getCard(4)!.gameObject.position.clone();

        const pos2 = this.fields[0].monsterZone[3].position.clone();

        const pos3 = this.fields[0].monsterZone[3].position.clone();

        card.gameObject.position.copy(pos1);

        pos2.z += 6;

        this.tasks.startTask(new YGOTaskSequence().add(
            new PositionTransition({
                gameObject: card.gameObject,
                position: pos1,
                duration: 0
            })
        ).add(
            new PositionTransition({
                gameObject: card.gameObject,
                position: pos2,
                duration: 0.35
            })
        ).add(
            new PositionTransition({
                gameObject: card.gameObject,
                position: pos3,
                duration: 0.25
            })
        ).add(new WaitForSeconds(0.5)).add(new CallbackTransition(() => {
            alert("Done")
        })));
    }
}