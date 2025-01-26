import * as THREE from 'three';
import { YGOPlayerCore } from './YGOPlayerCore';
import { GameFieldLocation, YGODuelState, YGOUiElement } from '../types';
import { YGOCore } from '../../YGOCore';
import { YGOEntity } from './YGOEntity';
import { GameController } from '../game/GameController';
import { EventBus } from '../scripts/event-bus';
import { YGOMouseEvents } from './components/YGOMouseEvents';
import { createFields, getTransformFromCamera } from '../scripts/ygo-utils';
import { PlayerField } from '../game/PlayerField';
import { YGOMath } from './YGOMath';
import { GameCardHand } from '../game/GameCardHand';
import { ActionCardSelection } from '../actions/ActionSelectCard';
import { YGOActionManager as ActionManager } from './components/YGOAction';
import { ActionCardHandMenu } from '../actions/ActionCardHandMenu';
import { ActionCardZoneMenu } from '../actions/ActionCardZoneMenu';
import { YGOTaskController } from './components/tasks/YGOTaskController';
import { GameCard } from '../game/GameCard';
import { PositionTransition } from '../duel-events/utils/position-transition';
import { YGOTaskSequence } from './components/tasks/YGOTaskSequence';
import { WaitForSeconds } from '../duel-events/utils/wait-for-seconds';
import { CallbackTransition } from '../duel-events/utils/callback';
import { YGOCommandsController } from './components/tasks/YGOCommandsController';

import YUBEL from '../../decks/YUBEL.json';
import CHIMERA from '../../decks/CHIMERA.json';
import { CardZone } from '../game/CardZone';

export class YGODuel {
    public state: YGODuelState;
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
    public commands: YGOCommandsController;
    public deltaTime: number = 0;
    private currentPlayerIndex = 0;

    constructor({ canvas }: any) {
        this.state = YGODuelState.EDITOR;
        this.core = new YGOPlayerCore({ canvas });
        this.core.renderer.setAnimationLoop(this.update.bind(this));
        this.camera = this.core.camera;
        this.entities = [];
        this.fields = [];
        this.gameController = new GameController(this);
        this.actionManager = new ActionManager();
        this.tasks = new YGOTaskController(this);
        this.commands = new YGOCommandsController(this);
        this.mouseEvents = new YGOMouseEvents(this);
        this.events = new EventBus();

        (window as any).YGODuel = this;
    }

    async load() {
        try {
            const [fieldModel] = await Promise.all([
                this.core.loadGLTFAsync(`http://127.0.0.1:8080/models/field.glb`),
                this.core.loadFontAsync("GameFont", "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json"),
            ]);
            this.core.scene.add(fieldModel.scene);
            this.core.camera.position.set(0, 0, 15);
            //this.core.camera.position.set(0, -10, 15);
            //this.core.camera.lookAt(0, 5, 0);
            this.gameController.addComponent("mouse_events", this.mouseEvents);
            this.gameController.addComponent("tasks", this.tasks);
            this.gameController.addComponent("commands", this.commands);

            this.fields = createFields({ duel: this, fieldModel: fieldModel.scene });
            this.gameController.addComponent("action_card_selection", new ActionCardSelection({ duel: this }));
            this.entities.push(this.gameController);

            this.createActions();

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
                        { id: 93729896, zone: "H" },
                        { id: 62318994, zone: "H" }, // lotus
                        { id: 62318994, zone: "H" }, // lotus
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

        this.ygo.duelLog.events.on("new-log", (command) => {
            if (this.commands.isRecovering()) return;

            this.events.publish("render-ui");
            this.commands.add(command);
        });

        this.ygo.duelLog.events.on("update-logs", (data) => {
            this.events.publish("logs-updated", data);
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

            for (let i = 0; i < gameField.extraMonsterZone.length; ++i) {
                const cardZone = gameField.extraMonsterZone[i];
                const card = duelField.extraMonsterZone[i];
                cardZone.setCard(card);
            }

            // TODO IMPROVE THE LOOPS AND ARRAY CREATIONS
            const hand: Array<GameCardHand | null> = [];

            for (let i = 0; i < duelField.hand.length; ++i) {
                const cardZone = gameField.hand.getCardFromReference(duelField.hand[i]);
                hand[i] = cardZone;
            }

            gameField.hand.cards.forEach(card => {
                if (card && !hand.includes(card)) {
                    console.log("DESTROY CARD IN HAND: ", card.card.name);
                    card.destroy();
                }
            });

            gameField.hand.cards = [];

            for (let i = 0; i < hand.length; ++i) {
                if (!hand[i]) {
                    const card = new GameCardHand({ duel: this })
                    card.setCard(duelField.hand[i]);
                    gameField.hand.cards[i] = card;
                } else {
                    gameField.hand.cards[i] = hand[i]!;
                }
                gameField.hand.cards[i].handIndex = i;
            }

            const fieldZoneCard = gameField.fieldZone;
            const fieldZoneCardZone = duelField.fieldZone;
            fieldZoneCard.setCard(fieldZoneCardZone);
            fieldZoneCard.updateCard();
        }

        this.renderField();

        this.events.publish("render-ui");
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

    public renderField() { // only renders and updates cards
        for (let playerIndex = 0; playerIndex < this.fields.length; ++playerIndex) {
            const gameField = this.fields[playerIndex];

            for (let i = 0; i < gameField.monsterZone.length; ++i) {
                gameField.monsterZone[i].updateCard();
            }

            for (let i = 0; i < gameField.spellTrapZone.length; ++i) {
                gameField.spellTrapZone[i].updateCard();
            }

            for (let i = 0; i < gameField.extraMonsterZone.length; ++i) {
                gameField.extraMonsterZone[i].updateCard();
            }

            gameField.fieldZone.updateCard();

            // hand 
            const cardWidth = 3;
            const cardSpacing = 2.2;
            const totalCards = gameField.hand.cards.length;

            const handWidth = (totalCards - 1) * cardSpacing + cardWidth;
            const handY = 6.8 * (playerIndex === 0 ? -1 : 1);
            const handZ = 5;

            for (let i = 0; i < gameField.hand.cards.length; ++i) {
                const xOffset = -handWidth / 2 + cardWidth / 2;
                const handCard = gameField.hand.getCard(i)!;
                handCard.gameObject.position.set(xOffset + i * cardSpacing, handY, handZ);
                handCard.gameObject.rotation.set(0, 0, 0);
            }

        }


        this.events.publish("render-ui");
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
        tempPos.z = 2;

        card.gameObject.position.copy(tempPos);

        const div = document.createElement("div");
        div.style.position = "fixed";
        div.style.width = "50px";
        div.style.height = "50px";
        div.style.background = "rgba(0,0,255,0.5)";
        //div.style.transformOrigin = "center";

        document.body.appendChild(div);

        this.tasks.startTask(new YGOTaskSequence()
            .add(new PositionTransition({
                gameObject: card.gameObject,
                position: new THREE.Vector3(-10, 0, 1),
                duration: 2
            }))
            .add(new PositionTransition({
                gameObject: card.gameObject,
                position: new THREE.Vector3(10, 5, 5),
                duration: 2
            }))
            .add(new PositionTransition({
                gameObject: card.gameObject,
                position: new THREE.Vector3(-10, 5, -5),
                duration: 2
            }))
        );


        setInterval(() => {
            const { x, y, width, height } = getTransformFromCamera(this, card.gameObject);

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