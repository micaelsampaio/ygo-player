import { useEffect, useState } from "react";
import styled from "styled-components";
import { Card, YGOGameUtils } from "ygo-core";

interface Field {
  monsterZones: (Card | null)[];
  spellTrapZones: (Card | null)[];
  extraMonsterZones: (Card | null)[];
  hand: Card[];
}

const EMPTY_FIELD: Field = {
  monsterZones: [null, null, null, null, null],
  spellTrapZones: [null, null, null, null, null],
  extraMonsterZones: [null, null],
  hand: [],
};

export function ComboChooseDeck({
  deckId,
  onChoose,
}: {
  deckId: string;
  onChoose: any;
}) {
  const [selectedDeck, setSelectedDeck] = useState<string>(deckId);
  const [deck, setDeck] = useState<{ mainDeck: Card[]; extraDeck: Card[] }>({
    mainDeck: [],
    extraDeck: [],
  });
  const [field, setField] = useState<Field>(() => ({ ...EMPTY_FIELD }));

  useEffect(() => {
    const deck: any = JSON.parse(
      window.localStorage.getItem(selectedDeck) || "{}"
    );
    let id = 0;
    deck.mainDeck.forEach((card: any) => (card.index = ++id));
    deck.extraDeck.forEach((card: any) => (card.index = ++id));
    setDeck(deck);
    setField({ ...EMPTY_FIELD });
  }, [selectedDeck]);

  const handleCardDrop = (zoneType: string, index: number, card: Card) => {
    // Handle the logic when a card is dropped into a specific zone
    const updatedField = { ...field };

    if (zoneType === "monsterZone") {
      updatedField.monsterZones[index] = card;
    } else if (zoneType === "spellTrapZone") {
      updatedField.spellTrapZones[index] = card;
    } else if (zoneType === "extraMonsterZone") {
      updatedField.extraMonsterZones[index] = card;
    } else if (zoneType === "hand") {
      updatedField.hand.push(card);
    }

    setField(updatedField);
  };

  const handleDragStart = (card: Card) => {
    // Storing the dragged card data in the dataTransfer object
    window.localStorage.setItem("draggedCard", JSON.stringify(card));
  };

  const handleDrop = (e: React.DragEvent, zoneType: string, index: number) => {
    e.preventDefault();
    const draggedCard = JSON.parse(
      window.localStorage.getItem("draggedCard") || "{}"
    );

    const mainDeck = deck.mainDeck.filter(
      (card) => card.index !== draggedCard.index
    );
    const extraDeck = deck.extraDeck.filter(
      (card) => card.index !== draggedCard.index
    );

    setDeck((d) => ({ ...d, mainDeck, extraDeck }));
    handleCardDrop(zoneType, index, draggedCard);
  };

  const startDuel = () => {
    const deck = JSON.parse(window.localStorage.getItem(selectedDeck) || "{}");
    const fieldState: any = [];

    field.hand.forEach((card, index) => {
      if (card) {
        fieldState.push({
          id: card.id,
          zone: "H",
        });
      }
    });

    field.monsterZones.forEach((card, index) => {
      if (card) {
        fieldState.push({
          id: card.id,
          zone: YGOGameUtils.createZone("M", 0, index + 1),
        });
      }
    });

    field.spellTrapZones.forEach((card, index) => {
      if (card) {
        fieldState.push({
          id: card.id,
          zone: YGOGameUtils.createZone("S", 0, index + 1),
        });
      }
    });

    field.extraMonsterZones.forEach((card, index) => {
      if (card) {
        fieldState.push({
          id: card.id,
          zone: YGOGameUtils.createZone("EMZ", 0, index + 1),
        });
      }
    });

    const result = {
      deck: {
        mainDeck: deck.mainDeck,
        extraDeck: deck.extraDeck,
      },
      fieldState,
    };

    console.log("result", result);

    onChoose(result);
  };

  return (
    <Container>
      <CardsContainer>
        <DeckGrid>
          {deck.mainDeck.map((card, index) => (
            <DraggableCard
              key={card.index}
              onDragStart={() => handleDragStart(card)}
              draggable
            >
              <CardComponent card={card} />
            </DraggableCard>
          ))}
        </DeckGrid>

        <DeckGrid>
          {deck.extraDeck.map((card, index) => (
            <DraggableCard
              key={card.index}
              onDragStart={() => handleDragStart(card)}
              draggable
            >
              <CardComponent card={card} />
            </DraggableCard>
          ))}
        </DeckGrid>
      </CardsContainer>

      <FieldContainer>
        <ZoneContainer>
          {field.extraMonsterZones.map((card, index) => (
            <DropZone
              key={`extraMonsterZone-${index}`}
              onDrop={(e) => handleDrop(e, "extraMonsterZone", index)}
              onDragOver={(e) => e.preventDefault()}
            >
              {card && <CardComponent card={card} />}
            </DropZone>
          ))}
        </ZoneContainer>

        <ZoneContainer>
          {field.monsterZones.map((card, index) => (
            <DropZone
              key={`monsterZone-${index}`}
              onDrop={(e) => handleDrop(e, "monsterZone", index)}
              onDragOver={(e) => e.preventDefault()}
            >
              {card && <CardComponent card={card} />}
            </DropZone>
          ))}
        </ZoneContainer>

        <ZoneContainer>
          {field.spellTrapZones.map((card, index) => (
            <DropZone
              key={`spellTrapZone-${index}`}
              onDrop={(e) => handleDrop(e, "spellTrapZone", index)}
              onDragOver={(e) => e.preventDefault()}
            >
              {card && <CardComponent card={card} />}
            </DropZone>
          ))}
        </ZoneContainer>

        <HandContainer
          onDrop={(e) => {
            e.preventDefault();
            const draggedCard = JSON.parse(
              window.localStorage.getItem("draggedCard") || "{}"
            );
            handleCardDrop("hand", field.hand.length, draggedCard); // Add card to hand
          }}
          onDragOver={(e) => e.preventDefault()} // Allow drag over event
        >
          {field.hand.length > 0 ? (
            <HandGrid>
              {field.hand.map((card: Card) => (
                <CardComponent key={card.index} card={card} />
              ))}
            </HandGrid>
          ) : (
            <NoCardsMessage>No cards in hand. Drop cards here</NoCardsMessage>
          )}
        </HandContainer>

        <div>
          <Button onClick={startDuel}>Start Duel</Button>
        </div>
      </FieldContainer>
    </Container>
  );
}

export const CardComponent = ({ card }: { card: Card }) => {
  return (
    <CardContainer draggable>
      <CardImage
        src={`http://localhost:8080/images/cards_small/${card.id}.jpg`}
        alt={card.name}
      />
      <CardInfo>
        <CardName>{card.name}</CardName>
      </CardInfo>
    </CardContainer>
  );
};

const Button = styled.button`
  padding: 10px 20px;
  background-color: #1e90ff;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.2s ease;

  &:hover {
    background-color: #4682b4;
  }

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const CardContainer = styled.div`
  width: 100px;
  height: 140px;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  cursor: grab;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5px;
  transition: all 0.3s ease;

  &:active {
    opacity: 0.7;
  }
`;

const CardImage = styled.img`
  width: 75px;
  height: 100px;
  border-radius: 4px;
  margin-bottom: 5px;
  border-radius: 4px;
  pointer-events: none;
`;

const CardInfo = styled.div`
  text-align: center;
  max-width: 100%;
`;

const CardName = styled.div`
  font-size: 12px;
  font-weight: bold;
  color: #333;
  overflow: hidden;
  max-width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Container = styled.div`
  display: flex;
  flex-direction: row;
  padding: 20px;
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0px;
  left: 0px;
  z-index: 9999;
  background: white;
`;

const CardsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 20px;
  overflow-y: auto;
`;

const DeckGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 20px;
`;

const FieldContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 20px;
`;

const ZoneContainer = styled.div`
  display: flex;
  justify-content: space-around;
  gap: 10px;
  margin-bottom: 20px;
`;

const DropZone = styled.div`
  width: 100px;
  height: 140px;
  border: 1px solid #ccc;
  border-radius: 10px;
  background-color: #f1f1f1;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;

  &:hover {
    background-color: #e0e0e0;
  }
`;

const HandContainer = styled.div`
  overflow-x: auto;
  display: flex;
  flex-wrap: nowrap;
  gap: 10px;
  padding-bottom: 10px;
  max-width: 100%;
  min-height: 50px;
  align-items: center;
`;

const HandGrid = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const NoCardsMessage = styled.div`
  color: #777;
`;

const DraggableCard = styled.div`
  cursor: pointer;
  &:active {
    opacity: 0.7;
  }
`;
