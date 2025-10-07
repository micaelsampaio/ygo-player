import { YGOCommands, YGOGameUtils } from "ygo-core";
import { Card, CardPosition, FieldZone } from "ygo-core";
import { ActionCardSelection } from "../actions/ActionSelectCard";
import { CardZone } from "../game/CardZone";
import {
  getCardZones,
  getGameZone,
  getMonstersZones,
  getXyzMonstersZones,
} from "../scripts/ygo-utils";
import { CardZoneKV } from "../types";
import { YGODuel } from "./YGODuel";
import { YGODuelPhase } from "ygo-core";

export class YGOGameActions {
  private duel: YGODuel;
  private cardSelection: ActionCardSelection;

  constructor(duel: YGODuel) {
    this.duel = duel;
    this.cardSelection =
      this.duel.gameController.getComponent<ActionCardSelection>(
        "action_card_selection"
      );
  }

  //////////// UTILS
  private clearAction() {
    this.duel.events.dispatch("clear-ui-action");
  }

  //////////////////////// COMMANDS

  public normalSummon({
    card,
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
  }) {
    this.clearAction();

    const player = this.duel.getActivePlayer();
    const zones = getCardZones(this.duel, [card.originalOwner], ["M"]);

    this.cardSelection.startSelection({
      zones,
      selectionType: "zone",
      onSelectionCompleted: (cardZone: any) => {
        this.duel.execCommand(
          new YGOCommands.NormalSummonCommand({
            player,
            id: card.id,
            originZone,
            zone: cardZone.zone,
          })
        );
      },
    });
  }

  public setSummon({
    card,
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
  }) {
    this.clearAction();

    const player = this.duel.getActivePlayer();
    const zones = getCardZones(this.duel, [card.originalOwner], ["M"]);

    this.cardSelection.startSelection({
      zones,
      selectionType: "zone",
      onSelectionCompleted: (cardZone: any) => {
        this.duel.execCommand(
          new YGOCommands.SetMonsterCommand({
            player,
            id: card.id,
            originZone,
            zone: cardZone.zone,
          })
        );
      },
    });
  }

  public specialSummon({
    card,
    originZone,
    position = "faceup-attack",
  }: {
    card: Card;
    originZone: FieldZone;
    position?: CardPosition;
  }) {
    this.clearAction();

    const player = this.duel.getActivePlayer();
    const zones = getCardZones(this.duel, [card.originalOwner], ["M"]);

    this.cardSelection.startSelection({
      zones,
      selectionType: "zone",
      onSelectionCompleted: (cardZone: any) => {
        this.duel.execCommand(
          new YGOCommands.SpecialSummonCommand({
            player,
            id: card.id,
            originZone,
            zone: cardZone.zone,
            position,
          })
        );
      },
    });
  }

  public tributeSummon({
    card,
    position = "faceup-attack",
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
    position?: CardPosition;
  }) {
    this.clearAction();

    const player = this.duel.getActivePlayer();

    const zones = getMonstersZones(this.duel, [card.originalOwner]);

    this.cardSelection.startMultipleSelection({
      zones,
      selectionType: "card",
      onSelectionCompleted: (cardZones: CardZone[]) => {
        const tributes = cardZones.map((cardZone) => {
          return {
            id: cardZone.getCardReference()!.id,
            zone: cardZone.zone,
          };
        });

        const zonesToSummon = getCardZones(
          this.duel,
          [card.originalOwner],
          ["M"]
        );
        cardZones.forEach((z) => zonesToSummon.push(z));

        this.cardSelection.startSelection({
          zones: zonesToSummon,
          selectionType: "zone",
          onSelectionCompleted: (cardZone: any) => {
            this.duel.execCommand(
              new YGOCommands.TributeSummonCommand({
                player,
                id: card.id,
                tributes,
                originZone,
                zone: cardZone.zone,
                position,
              })
            );

            this.clearAction();
          },
        });
      },
    });
  }

  public linkSummon({ card }: { card: Card }) {
    this.clearAction();

    const player = this.duel.getActivePlayer();
    const cardIndex = this.duel.ygo.state.fields[
      card.originalOwner
    ].extraDeck.findIndex((c: any) => c === card);
    const zones = getMonstersZones(this.duel, [card.originalOwner]).filter(
      (zone) => YGOGameUtils.isFaceUp(zone.getCardReference()!)
    );

    this.cardSelection.startMultipleSelection({
      zones,
      selectionType: "card",
      onSelectionCompleted: (cardZones: CardZone[]) => {
        const materials = cardZones.map((cardZone) => {
          return {
            id: cardZone.getCardReference()!.id,
            zone: cardZone.zone,
          };
        });

        const zonesToSummon = getCardZones(
          this.duel,
          [card.originalOwner],
          ["M", "EMZ"]
        );
        cardZones.forEach((z) => zonesToSummon.push(z));

        this.cardSelection.startSelection({
          zones: zonesToSummon,
          selectionType: "zone",
          onSelectionCompleted: (cardZone: any) => {
            this.duel.execCommand(
              new YGOCommands.LinkSummonCommand({
                player,
                id: card.id,
                materials,
                originZone: YGOGameUtils.createZone(
                  "ED",
                  card.originalOwner,
                  cardIndex + 1
                ),
                zone: cardZone.zone,
              })
            );

            this.clearAction();
          },
        });
      },
    });
  }

  public xyzSummon({
    card,
    position = "faceup-attack",
  }: {
    card: Card;
    position?: CardPosition;
  }) {
    this.clearAction();

    const player = this.duel.getActivePlayer();
    const cardIndex = this.duel.ygo.state.fields[
      card.originalOwner
    ].extraDeck.findIndex((c: any) => c === card);
    const zones = getMonstersZones(this.duel, [card.originalOwner]).filter(
      (zone) => !YGOGameUtils.isToken(zone.getCardReference()!) && YGOGameUtils.isFaceUp(zone.getCardReference()!)
    );

    this.cardSelection.startMultipleSelection({
      zones,
      selectionType: "card",
      onSelectionCompleted: (cardZones: CardZone[]) => {
        const materials = cardZones.map((cardZone) => {
          return {
            id: cardZone.getCardReference()!.id,
            zone: cardZone.zone,
          };
        });

        const zonesToSummon = getCardZones(
          this.duel,
          [card.originalOwner],
          ["M", "EMZ"]
        );
        cardZones.forEach((z) => zonesToSummon.push(z));

        this.cardSelection.startSelection({
          zones: zonesToSummon,
          selectionType: "zone",
          onSelectionCompleted: (cardZone: any) => {
            this.duel.execCommand(
              new YGOCommands.XYZSummonCommand({
                player,
                id: card.id,
                materials,
                originZone: YGOGameUtils.createZone(
                  "ED",
                  card.originalOwner,
                  cardIndex + 1
                ),
                zone: cardZone.zone,
                position,
              })
            );

            this.clearAction();
          },
        });
      },
    });
  }

  public xyzOverlaySummon({
    card,
    position = "faceup-attack",
  }: {
    card: Card;
    position?: CardPosition;
  }) {
    this.clearAction();

    const player = this.duel.getActivePlayer();
    const cardIndex = this.duel.ygo.state.fields[
      card.originalOwner
    ].extraDeck.findIndex((c: any) => c === card);
    const zones = getMonstersZones(this.duel, [card.originalOwner]).filter(
      (zone) => !YGOGameUtils.isToken(zone.getCardReference()!) && YGOGameUtils.isFaceUp(zone.getCardReference()!)
    );

    this.cardSelection.startMultipleSelection({
      zones,
      selectionType: "card",
      onSelectionCompleted: (cardZones: CardZone[]) => {
        const materials = cardZones.map((cardZone) => {
          return {
            id: cardZone.getCardReference()!.id,
            zone: cardZone.zone,
          };
        });

        const zonesToSummon = getCardZones(
          this.duel,
          [card.originalOwner],
          ["M", "EMZ"]
        );
        cardZones.forEach((z) => zonesToSummon.push(z));

        this.cardSelection.startSelection({
          zones: zonesToSummon,
          selectionType: "zone",
          onSelectionCompleted: (cardZone: any) => {
            this.duel.execCommand(
              new YGOCommands.XYZOverlaySummonCommand({
                player,
                id: card.id,
                materials,
                originZone: YGOGameUtils.createZone(
                  "ED",
                  card.originalOwner,
                  cardIndex + 1
                ),
                zone: cardZone.zone,
                position,
              })
            );

            this.clearAction();
          },
        });
      },
    });
  }

  public synchroSummon({
    card,
    position = "faceup-attack",
  }: {
    card: Card;
    position?: CardPosition;
  }) {
    this.clearAction();

    const player = this.duel.getActivePlayer();
    const cardIndex = this.duel.ygo.state.fields[
      card.originalOwner
    ].extraDeck.findIndex((c: any) => c === card);
    const zones = getMonstersZones(this.duel, [card.originalOwner]);

    this.cardSelection.startMultipleSelection({
      zones,
      selectionType: "card",
      onSelectionCompleted: (cardZones: CardZone[]) => {
        const materials = cardZones.map((cardZone) => {
          return {
            id: cardZone.getCardReference()!.id,
            zone: cardZone.zone,
          };
        });

        const zonesToSummon = getCardZones(
          this.duel,
          [card.originalOwner],
          ["M", "EMZ"]
        );
        cardZones.forEach((z) => zonesToSummon.push(z));

        this.cardSelection.startSelection({
          zones: zonesToSummon,
          selectionType: "zone",
          onSelectionCompleted: (cardZone: CardZone) => {
            this.duel.execCommand(
              new YGOCommands.SynchroSummonCommand({
                player,
                id: card.id,
                materials,
                originZone: YGOGameUtils.createZone(
                  "ED",
                  card.originalOwner,
                  cardIndex + 1
                ),
                zone: cardZone.zone,
                position,
              })
            );

            this.clearAction();
          },
        });
      },
    });
  }

  public fusionSummon({
    card,
    position = "faceup-attack",
  }: {
    card: Card;
    position?: CardPosition;
  }) {
    const player = this.duel.getActivePlayer();

    this.duel.events.dispatch("toggle-ui-menu", {
      group: "game-popup",
      type: "select-card-menu",
      data: {
        player,
        filter: {
          monsters: true,
          field: true,
          hand: true,
          mainDeck: true,
        },
        onSelectCards: (cards: CardZoneKV[]) => {
          this.duel.events.dispatch("close-ui-menu", {
            type: "select-card-menu",
          });

          const cardIndex = this.duel.ygo.state.fields[
            card.originalOwner
          ].extraDeck.findIndex((c: any) => c === card);

          const materials = cards.map((cardData) => {
            return { id: cardData.card.id, zone: cardData.zone };
          });

          const zonesToSummon = getCardZones(
            this.duel,
            [card.originalOwner],
            ["M", "EMZ"]
          );

          materials.forEach((material) => {
            const zoneData = YGOGameUtils.getZoneData(material.zone);
            if (zoneData.zone === "M") {
              const cardZone = getGameZone(this.duel, zoneData)!;
              zonesToSummon.push(cardZone);
            }
          });

          this.cardSelection.startSelection({
            zones: zonesToSummon,
            selectionType: "zone",
            onSelectionCompleted: (cardZone: CardZone) => {
              this.duel.execCommand(
                new YGOCommands.FusionSummonCommand({
                  player,
                  id: card.id,
                  materials,
                  originZone: YGOGameUtils.createZone(
                    "ED",
                    card.originalOwner,
                    cardIndex + 1
                  ),
                  zone: cardZone.zone,
                  position,
                })
              );

              this.clearAction();
            },
          });
        },
      },
    });
  }

  public createToken({ position }: { position?: CardPosition } = {}) {
    this.clearAction();

    const player = this.duel.getActivePlayer();
    const zones = getCardZones(this.duel, [0, 1], ["M"]);

    this.cardSelection.startSelection({
      zones,
      selectionType: "zone",
      onSelectionCompleted: (cardZone: CardZone) => {
        this.duel.execCommand(
          new YGOCommands.CreateTokenCommand({
            player,
            originZone: cardZone.zone,
            position,
          })
        );
      },
    });
  }

  public disapear({
    card,
    originZone,
  }: {
    card: Card,
    originZone: FieldZone;
  }) {
    if (!YGOGameUtils.isToken(card)) return;

    const player = this.duel.getActivePlayer();

    this.duel.execCommand(
      new YGOCommands.DisappearCommand({
        player,
        id: card.id,
        originZone,
      })
    );
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
    this.clearAction();

    const player = this.duel.getActivePlayer();

    if (selectZone) {
      const zones = getCardZones(this.duel, [card.originalOwner], ["S"]);

      this.cardSelection.startSelection({
        zones,
        selectionType: "zone",
        onSelectionCompleted: (cardZone: any) => {
          this.duel.execCommand(
            new YGOCommands.SetCardCommand({
              player,
              id: card.id,
              originZone,
              zone: cardZone.zone,
              reveal,
            })
          );
        },
      });
    } else {
      this.duel.execCommand(
        new YGOCommands.SetCardCommand({
          id: card.id,
          player,
          originZone,
          zone,
          reveal,
        })
      );
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
    this.clearAction();

    const player = this.duel.getActivePlayer();

    if (selectZone) {
      const zones = getCardZones(this.duel, [card.originalOwner], ["S"]);

      this.cardSelection.startSelection({
        zones,
        selectionType: "zone",
        onSelectionCompleted: (cardZone: any) => {
          this.duel.execCommand(
            new YGOCommands.ActivateCardCommand({
              player,
              id: card.id,
              originZone,
              zone: cardZone.zone,
            })
          );
        },
      });
    } else {
      this.duel.execCommand(
        new YGOCommands.ActivateCardCommand({
          player,
          id: card.id,
          zone: originZone,
        })
      );
    }
  }

  public sendToGy({ card, originZone }: { card: Card; originZone: FieldZone }) {
    this.clearAction();

    this.duel.execCommand(
      new YGOCommands.SendCardToGYCommand({
        player: this.duel.getActivePlayer(),
        id: card.id,
        originZone,
      })
    );
  }

  public revealCard({
    card,
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
  }) {
    this.clearAction();

    this.duel.execCommand(
      new YGOCommands.RevealCommand({
        player: this.duel.getActivePlayer(),
        id: card.id,
        originZone,
      })
    );
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
    this.duel.execCommand(
      new YGOCommands.BanishCommand({
        player: this.duel.getActivePlayer(),
        id: card.id,
        originZone,
        position,
      })
    );
  }

  public toST({ card, originZone }: { card: Card; originZone: FieldZone }) {
    this.clearAction();

    const player = this.duel.getActivePlayer();
    const zones = getCardZones(this.duel, [card.originalOwner], ["S"]);

    this.cardSelection.startSelection({
      zones,
      selectionType: "zone",
      onSelectionCompleted: (cardZone: any) => {
        this.duel.execCommand(
          new YGOCommands.ToSTCommand({
            player,
            id: card.id,
            originZone,
            zone: cardZone.zone,
          })
        );
      },
    });
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
    this.clearAction();

    const player = this.duel.getActivePlayer();
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

  public toHand({ card, originZone }: { card: Card; originZone: FieldZone }) {
    this.clearAction();

    const player = this.duel.getActivePlayer();

    if (card.isMainDeckCard) {
      this.duel.execCommand(
        new YGOCommands.ToHandCommand({
          player,
          id: card.id,
          originZone,
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
    const player = this.duel.getActivePlayer();

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
    this.clearAction();

    const player = this.duel.getActivePlayer();
    const isFieldSpell = YGOGameUtils.isFieldSpell(card);
    const zonesToMove: any = ["M", "S"];

    if (isFieldSpell) zonesToMove.push("F");

    const zones = getCardZones(this.duel, [0, 1], zonesToMove).filter(
      (c) => c.zone !== originZone
    );

    this.cardSelection.startSelection({
      zones,
      selectionType: "zone",
      onSelectionCompleted: (cardZone: any) => {
        this.duel.execCommand(
          new YGOCommands.MoveCardCommand({
            player,
            id: card.id,
            originZone,
            zone: cardZone.zone,
          })
        );
      },
    });
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
    const player = this.duel.getActivePlayer();
    this.duel.execCommand(
      new YGOCommands.ToDeckCommand({
        player,
        id: card.id,
        originZone,
        position,
        shuffle,
      })
    );
  }

  public flip({ card, originZone }: { card: Card; originZone: FieldZone }) {
    const player = this.duel.getActivePlayer();
    this.duel.execCommand(
      new YGOCommands.FlipCommand({
        player,
        id: card.id,
        originZone,
      })
    );
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
    const player = this.duel.getActivePlayer();

    this.duel.execCommand(
      new YGOCommands.ChangeCardPositionCommand({
        player,
        id: card.id,
        originZone,
        position,
      })
    );
  }

  public drawFromDeck({ player }: { player: number }) {
    this.duel.execCommand(new YGOCommands.DrawFromDeckCommand({ player }));
  }

  public milFromDeck({
    player,
    numberOfCards = 1,
  }: {
    player: number;
    numberOfCards?: number;
  }) {
    this.duel.execCommand(
      new YGOCommands.MillFromDeckCommand({ player, numberOfCards })
    );
  }

  public attachMaterial({
    card,
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
  }) {
    this.clearAction();
    const player = this.duel.getActivePlayer();
    const xyzZones = getXyzMonstersZones(this.duel, [0, 1]).filter(c => c.getCardReference() !== card);

    if (xyzZones.length === 0) return;

    this.cardSelection.startSelection({
      zones: xyzZones,
      selectionType: "zone",
      onSelectionCompleted: (cardZone: any) => {
        this.duel.execCommand(
          new YGOCommands.XYZAttachMaterialCommand({
            player,
            id: card.id,
            originZone,
            zone: cardZone.zone,
          })
        );
      },
    });
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
    const player = this.duel.getActivePlayer();
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
    this.clearAction();

    const player = this.duel.getActivePlayer();

    this.duel.execCommand(
      new YGOCommands.DestroyCardCommand({
        player,
        id: card.id,
        originZone,
      })
    );
  }

  public destroyAllCards({
    zone,
  }: {
    zone: "monster" | "spell" | "all";
  }) {
    this.clearAction();

    const player = this.duel.getActivePlayer();

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
    this.clearAction();

    const player = this.duel.getActivePlayer();

    this.duel.execCommand(
      new YGOCommands.TargetCommand({
        player,
        id: card.id,
        originZone,
      })
    );
  }

  public negateCard({
    card,
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
  }) {
    this.clearAction();

    const player = this.duel.getActivePlayer();

    this.duel.execCommand(
      new YGOCommands.NegateCommand({
        player,
        id: card.id,
        originZone,
      })
    );
  }

  public changeAtkDef({
    card,
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
  }) {
    const player = this.duel.getActivePlayer();
    const atkInput = window.prompt("Please enter atk:");
    let defInput: string | null = null;

    if (!YGOGameUtils.isLinkMonster(card)) {
      defInput = window.prompt("Please enter def:");
    }

    const atk = atkInput && !isNaN(atkInput as any) ? Number(atkInput) : undefined;
    const def = defInput && !isNaN(defInput as any) ? Number(defInput) : undefined;

    this.duel.execCommand(
      new YGOCommands.ChangeCardAtkDefCommand({
        player,
        id: card.id,
        originZone,
        atk,
        def,
      })
    );
  }

  public changeCardLevel({
    card,
    originZone
  }: {
    card: Card;
    originZone: FieldZone;
  }) {
    const player = this.duel.getActivePlayer();
    const levelInput = window.prompt("Please enter the new level:");

    const level = levelInput && !isNaN(levelInput as any) ? Number(levelInput) : undefined;

    if (typeof level === "undefined") return;

    this.duel.execCommand(new YGOCommands.ChangeCardLevelCommand({ player, id: card.id, originZone, level }));
  }

  public lifePointsTransaction({
    player,
    value
  }: {
    player: number,
    value: string,
  }) {
    this.duel.execCommand(new YGOCommands.LifePointsTransactionCommand({ player, value }));
  }

  public swapPlayerHand({
    player,
  }: {
    player: number
  }) {
    this.duel.execCommand(new YGOCommands.SwapHandCommand({ player }));
  }

  public addDuelNote({
    player,
    note,
    duration
  }: {
    player?: number
    note: string,
    duration?: number
  }) {
    const parsedDuration = duration && !isNaN(duration) && duration > 0 ? duration : -1;

    this.duel.execCommand(new YGOCommands.NoteCommand({
      player: player ?? this.duel.getActivePlayer(),
      note,
      duration: parsedDuration
    }));
  }

  public setDuelPhase({ phase }: { phase: YGODuelPhase }) {
    this.duel.execCommand(new YGOCommands.DuelPhaseCommand({
      phase
    }));
  }

  public nextDuelturn() {
    this.duel.execCommand(new YGOCommands.DuelTurnCommand());
  }

  public attack({ attackingId, attackingZone, attackedId, attackedZone, destroyAttacking, destroyAttacked, battleDamage }: {
    attackingId: number, attackingZone: FieldZone, attackedId: number, attackedZone: FieldZone,
    destroyAttacking?: boolean, destroyAttacked?: boolean, battleDamage?: number
  }) {

    const attackingZoneData = YGOGameUtils.getZoneData(attackingZone);
    const attackedZoneData = YGOGameUtils.getZoneData(attackedZone);

    this.duel.execCommand(new YGOCommands.AttackCommand({
      player: attackingZoneData.player,
      attackedId,
      attackedZone,
      attackingId,
      attackingZone
    }))

    if (destroyAttacking) {
      this.duel.execCommand(new YGOCommands.DestroyCardCommand({
        player: attackingZoneData.player,
        id: attackingId,
        originZone: attackingZone
      }))
    }

    if (destroyAttacked) {
      this.duel.execCommand(new YGOCommands.DestroyCardCommand({
        player: attackedZoneData.player,
        id: attackedId,
        originZone: attackedZone
      }))
    }

    if (battleDamage && battleDamage > 0) {
      this.duel.execCommand(new YGOCommands.LifePointsTransactionCommand({
        player: attackedZoneData.player,
        value: "-" + battleDamage.toString()
      }))
    }

    if (battleDamage && battleDamage < 0) {
      this.duel.execCommand(new YGOCommands.LifePointsTransactionCommand({
        player: attackingZoneData.player,
        value: battleDamage.toString()
      }))
    }
  }

  public attackDirectly({ id, originZone }: {
    id: number, originZone: FieldZone
  }) {

    const attackZoneData = YGOGameUtils.getZoneData(originZone);
    const card = this.duel.ygo.state.getCardFromZone(originZone)!;
    this.duel.execCommand(new YGOCommands.AttackDirectlyCommand({
      player: attackZoneData.player,
      id,
      originZone
    }))

    if (card.currentAtk > 0) {
      this.duel.execCommand(new YGOCommands.LifePointsTransactionCommand({
        player: 1 - attackZoneData.player,
        value: `-${card.currentAtk}`
      }))
    }
  }
}
