import { PlayerInfo } from "ygo-core";
import type { Banish } from "./Banish";
import type { CardZone } from "./CardZone";
import type { Deck } from "./Deck";
import type { ExtraDeck } from "./ExtraDeck";
import type { Graveyard } from "./Graveyard";
import type { GameHand } from "./Hand";
import type { YGOGameCard } from "./YGOGameCard";

export class PlayerField {
  public playerIndex: number = 0;
  public player!: PlayerInfo;
  public cardsPool!: YGOGameCard[];
  // hand: YGOGameCard[]
  // monsterZone: Array<YGOGameCard>
  // spellTrapZone: Array<YGOGameCard>
  // extraMonsterZone: Array<YGOGameCard>;
  // Assigned by createFields while it builds the field from the zone meshes.
  public mainDeck!: Deck;
  public extraDeck!: ExtraDeck;
  public hand!: GameHand;
  public graveyard!: Graveyard;
  public banishedZone!: Banish;
  public monsterZone: CardZone[] = [];
  public spellTrapZone: CardZone[] = [];
  public fieldZone!: CardZone;
  public extraMonsterZone: CardZone[] = [];
  public settings = {
    backCardPath: "",
    showCards: false,
    controlCards: false
  }
}
