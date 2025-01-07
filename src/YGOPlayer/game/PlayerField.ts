import { Card, PlayerInfo } from "../../YGOCore/types/types"
import { CardZone } from "./CardZone"
import { Deck } from "./Deck"
import { ExtraDeck } from "./ExtraDeck"
import { Graveyard } from "./Graveyard"
import { GameHand } from "./Hand"
import { YGOGameCard } from "./YGOGameCard"

export class PlayerField {

    public player!: PlayerInfo
    public cardsPool!: YGOGameCard[]
    // hand: YGOGameCard[]
    // monsterZone: Array<YGOGameCard>
    // spellTrapZone: Array<YGOGameCard>
    // extraMonsterZone: Array<YGOGameCard>;
    public mainDeck: Deck
    public extraDeck: ExtraDeck
    public hand: GameHand
    public graveyard: Graveyard
    public banishedZone: any
    public monsterZone: [CardZone, CardZone, CardZone, CardZone, CardZone]
    public spellTrapZone: [CardZone, CardZone, CardZone, CardZone, CardZone]
    public fieldZone: CardZone
    public extraMonsterZone: [CardZone, CardZone]

    constructor() {
        this.mainDeck = null as any;
        this.extraDeck = null as any;
        this.hand = null as any;
        this.monsterZone = [] as any;
        this.spellTrapZone = [] as any;
        this.extraMonsterZone = [] as any;
        this.fieldZone = null as any;
        this.graveyard = null as any;
        this.banishedZone = null;
    }

}