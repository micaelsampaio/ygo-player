import { YGODuel } from "../core/YGODuel";
import { YGOEntity } from "../core/YGOEntity";

export class GameController extends YGOEntity {
    public duel: YGODuel;

    constructor(ygo: YGODuel) {
        super();
        this.duel = ygo;
        this.name = "Game Controller";
    }
}