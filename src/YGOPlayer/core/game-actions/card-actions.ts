import { YGOCommands, YGOGameUtils } from "ygo-core";
import { Card, CardPosition, FieldZone } from "ygo-core";
import { getCardZones, getXyzMonstersZones } from "../../scripts/ygo-utils";
import { SummonActions } from "./summon-actions";

/** Moves and effects on a card: set, activate, send, banish, return, flip, materials, destroy, target, negate. */
export class CardActions extends SummonActions {
  public disapear({
    card,
    originZone,
  }: {
    card: Card,
    originZone: FieldZone;
  }) {
    if (!YGOGameUtils.isToken(card)) return;
    this.execOnCard(YGOCommands.DisappearCommand, { card, originZone }, { clear: false });
  }

  public setCard({
    card,
    originZone,
    zone,
    reveal = false,
    selectZone = true,
  }: {
    card: Card;
    originZone: FieldZone;
    zone?: FieldZone;
    reveal?: boolean;
    selectZone?: boolean;
  }) {
    if (selectZone && this.routeAssisted("Set ST", card, originZone)) return;

    if (selectZone) {
      this.selectZoneThen(
        () => getCardZones(this.duel, [card.originalOwner], ["S"]),
        (zone, player) => new YGOCommands.SetCardCommand({ player, id: card.id, originZone, zone, reveal })
      );
    } else {
      this.execOnCard(YGOCommands.SetCardCommand, { card, originZone, zone, reveal });
    }
  }

  public activateCard({
    card,
    originZone,
    selectZone = false,
  }: {
    card: Card;
    originZone: FieldZone;
    selectZone?: boolean;
  }) {
    if (this.routeAssisted("Activate", card, originZone)) return;

    if (selectZone) {
      this.selectZoneThen(
        () => getCardZones(this.duel, [card.originalOwner], ["S"]),
        (zone, player) => new YGOCommands.ActivateCardCommand({ player, id: card.id, originZone, zone })
      );
    } else {
      this.execOnCard(YGOCommands.ActivateCardCommand, { card, zone: originZone });
    }
  }

  public sendToGy({ card, player, originZone }: { card: Card; player?: number; originZone: FieldZone }) {
    this.execOnCard(YGOCommands.SendCardToGYCommand, { card, player, originZone });
  }

  public revealCard({
    card,
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
  }) {
    this.execOnCard(YGOCommands.RevealCommand, { card, originZone });
  }

  public banish({
    card,
    originZone,
    position = "faceup",
  }: {
    card: Card;
    originZone: FieldZone;
    position?: "faceup" | "facedown";
  }) {
    this.execOnCard(YGOCommands.BanishCommand, { card, originZone, position }, { clear: false });
  }

  public banishMultiple({
    cards,
    position = "faceup",
  }: {
    cards: { card: Card, zone: FieldZone }[];
    position?: "faceup" | "facedown";
  }) {
    this.duel.execCommand(
      new YGOCommands.BanishCommand({
        player: this.duel.serverActions.getActivePlayer(),
        ids: cards.map(data => ({ id: data.card.id, zone: data.zone })),
        position,
      })
    );
  }

  public toST({ card, originZone }: { card: Card; originZone: FieldZone }) {
    this.selectZoneThen(
      () => getCardZones(this.duel, [card.originalOwner], ["S"]),
      (zone, player) => new YGOCommands.ToSTCommand({ player, id: card.id, originZone, zone })
    );
  }

  public fieldSpell({
    card,
    originZone,
    position = "faceup",
  }: {
    card: Card;
    originZone: FieldZone;
    position?: "faceup" | "facedown";
  }) {
    if (this.routeAssisted(position === "facedown" ? "Set ST" : "Activate", card, originZone)) return;
    this.clearAction();

    const player = this.duel.serverActions.getActivePlayer();
    const cardZone = this.duel.fields[card.originalOwner].fieldZone;

    this.duel.execCommand(
      new YGOCommands.FieldSpellCommand({
        player,
        id: card.id,
        originZone,
        zone: cardZone.zone as "F" | "F2",
        position,
      })
    );
  }

  public toHand({ card, reveal, originZone }: { card: Card; reveal?: boolean, originZone: FieldZone }) {
    this.clearAction();

    const player = this.duel.serverActions.getActivePlayer();

    if (card.isMainDeckCard) {
      this.duel.execCommand(
        new YGOCommands.ToHandCommand({
          player,
          id: card.id,
          originZone,
          reveal
        })
      );
    } else {
      this.toExtraDeck({ card, originZone });
    }
  }

  public toExtraDeck({
    card,
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
  }) {
    this.clearAction();
    const player = this.duel.serverActions.getActivePlayer();

    if (card.isMainDeckCard && !YGOGameUtils.isPendulumCard(card)) {
      this.toHand({ card, originZone });
    } else {
      const zoneData = YGOGameUtils.getZoneData(originZone);
      this.duel.execCommand(
        new YGOCommands.ToExtraDeckCommand({
          player,
          id: card.id,
          originZone: YGOGameUtils.createZone(
            zoneData.zone,
            card.owner,
            zoneData.zoneIndex
          ),
        })
      );
    }
  }

  public moveCard({ card, originZone }: { card: Card; originZone: FieldZone }) {
    this.selectZoneThen(
      () => {
        const zonesToMove: any = ["M", "S"];
        if (YGOGameUtils.isFieldSpell(card)) zonesToMove.push("F");
        return getCardZones(this.duel, [0, 1], zonesToMove).filter((c) => c.zone !== originZone);
      },
      (zone, player) => new YGOCommands.MoveCardCommand({ player, id: card.id, originZone, zone })
    );
  }

  public toDeck({
    card,
    originZone,
    shuffle = false,
    position = "top",
  }: {
    card: Card;
    originZone: FieldZone;
    position: "top" | "bottom" | undefined;
    shuffle?: boolean;
  }) {

    if (!card.isMainDeckCard) return this.toExtraDeck({ card, originZone })

    this.execOnCard(YGOCommands.ToDeckCommand, { card, originZone, position, shuffle }, { clear: false });
  }

  public flip({ card, originZone }: { card: Card; originZone: FieldZone }) {
    this.execOnCard(YGOCommands.FlipCommand, { card, originZone }, { clear: false });
  }

  public changeBattlePosition({
    card,
    originZone,
    position,
  }: {
    card: Card;
    originZone: FieldZone;
    position: CardPosition;
  }) {
    this.execOnCard(YGOCommands.ChangeCardPositionCommand, { card, originZone, position }, { clear: false });
  }

  public attachMaterial({
    card,
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
  }) {
    this.selectZoneThen(
      () => getXyzMonstersZones(this.duel, [0, 1]).filter(c => c.getCardReference() !== card),
      (zone, player) => new YGOCommands.XYZAttachMaterialCommand({ player, id: card.id, originZone, zone }),
      { skipIfNoZones: true }
    );
  }

  public detachMaterial({
    card,
    originZone,
    materialIndex,
  }: {
    card: Card;
    originZone: FieldZone;
    materialIndex: number;
  }) {
    this.clearAction();
    const player = this.duel.serverActions.getActivePlayer();
    const material = card.materials[materialIndex];
    this.duel.execCommand(
      new YGOCommands.XYZDetachMaterialCommand({
        player,
        id: material.id,
        originZone,
        materialIndex,
      })
    );
  }

  public destroyCard({
    card,
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
  }) {
    this.execOnCard(YGOCommands.DestroyCardCommand, { card, originZone });
  }

  public destroyAllCards({
    zone,
  }: {
    zone: "monster" | "spell" | "all";
  }) {
    this.clearAction();

    const player = this.duel.serverActions.getActivePlayer();

    this.duel.execCommand(
      new YGOCommands.DestroyAllCardsOnFieldCommand({
        player,
        zone
      })
    );
  }

  public targetCard({
    card,
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
  }) {
    this.execOnCard(YGOCommands.TargetCommand, { card, originZone });
  }

  public negateCard({
    card,
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
  }) {
    this.execOnCard(YGOCommands.NegateCommand, { card, originZone });
  }
}
