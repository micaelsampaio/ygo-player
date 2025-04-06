import { useNavigate } from "react-router-dom";
import { useCollectionContext } from "./contex";
import { useState } from "react";
import { ChooseReplay } from './ChooseReplayModal';
import styled from "styled-components";
import short from 'short-uuid';
import { YgoReplayToImage } from "ygo-core-images-utils";
import { YGOCollection } from "./CollectionsPage";
import { getCard } from "../../scripts/download-deck";
import { YGOCore } from "ygo-core";

const cdnUrl = String(import.meta.env.VITE_YGO_CDN_URL);

export function CurrentCollection() {
    const [modal, setModal] = useState("");
    const { collection, decks, setCollection } = useCollectionContext();
    const navigate = useNavigate();

    const closeModal = () => setModal("");

    const updateCollectionDeck = (deckId: string) => {
        if (!deckId || !collection) return;

        const deckData = JSON.parse(window.localStorage.getItem(deckId)!);

        const deck = {
            name: deckId,
            mainDeck: deckData.mainDeck,
            extraDeck: deckData.extraDeck,
        };

        collection.deck = deck;
        setCollection(collection);
    };

    const updateCollectionName = (name: string) => {
        collection!.name = name;
        setCollection(collection!);
    };

    const openSpreadsheetBuilder = (replay: any) => {
        localStorage.setItem("duel-data", JSON.stringify(replay.data));
        navigate(`/spreadsheet/collection/${collection!.id}/${short.generate()}`);
    };

    if (!collection) return null;

    return (
        <PageContainer>
            <CollectionDetails>
                <InputSection>
                    <label>Collection Name:</label>
                    <input
                        value={collection.name}
                        onChange={(e) => updateCollectionName(e.target.value)}
                    />
                </InputSection>

                <DeckSelectSection>
                    <label>Select Deck:</label>
                    <select onChange={(e) => updateCollectionDeck(e.target.value)} value={collection.deck.name}>
                        <option></option>
                        {decks.map((deckName) => (
                            <option key={deckName} value={deckName}>
                                {deckName}
                            </option>
                        ))}
                    </select>
                </DeckSelectSection>

                {!collection.deck.mainDeck && <DeckWarning>Create a deck component main | extra deck</DeckWarning>}

                <DeckSection>
                    <h3>Deck: {collection.deck.name} ({collection.deck.mainDeck.length})</h3>

                    <DeckContent>
                        <div>
                            <h4>Main Deck</h4>
                            <CardList>
                                {collection.deck.mainDeck.map((card, i) => (
                                    <>
                                        <CardImage key={card.id + "_" + i} src={`${cdnUrl}/images/cards_small/${card.id}.jpg`} />
                                    </>
                                ))}
                            </CardList>
                        </div>

                        <div>
                            <h4>Extra Deck</h4>
                            <CardList>
                                {collection.deck.extraDeck.map((card, i) => (
                                    <>
                                        <CardImage key={card.id + "_" + i} src={`${cdnUrl}/images/cards_small/${card.id}.jpg`} />
                                    </>
                                ))}
                            </CardList>
                        </div>
                    </DeckContent>

                    <ExportSection>
                        <ExportButton>Export Image</ExportButton>
                        <ExportButton>Export YDK</ExportButton>
                    </ExportSection>
                </DeckSection>

                <CombosSection>
                    <h3>Combos</h3>
                    {collection.combos.map((combo, index) => (
                        <ComboCard key={index}>
                            <h4>{combo.name}</h4>
                            <ComboActions>
                                <ActionButton onClick={() => createComboImage(collection, combo)}>Create Image</ActionButton>
                                <ActionDeleteButton>Delete</ActionDeleteButton>
                            </ComboActions>
                        </ComboCard>
                    ))}

                    <NewComboButton onClick={() => setModal("choose_replay")}>Create New Combo</NewComboButton>
                    <ExportButton>Export</ExportButton>
                </CombosSection>
            </CollectionDetails>

            {modal === "choose_replay" && <ChooseReplay close={closeModal} onChange={openSpreadsheetBuilder} />}
        </PageContainer>
    );
}

// Styled Components

const PageContainer = styled.div`
    display: flex;
    flex-direction: column;
    padding: 20px;
    font-family: Arial, sans-serif;
    max-width: 1200px;
    width: 100%;
`;

const CollectionDetails = styled.div`
    max-width: 1000px;
    margin: 0 auto;
    background-color: #f9f9f9;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const InputSection = styled.div`
    margin-bottom: 20px;

    input {
        padding: 8px;
        width: 100%;
        font-size: 16px;
        margin-top: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
    }
`;

const DeckSelectSection = styled.div`
    margin-bottom: 20px;

    select {
        padding: 8px;
        width: 100%;
        font-size: 16px;
        margin-top: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
    }
`;

const DeckWarning = styled.div`
    color: red;
    font-size: 14px;
    margin-top: 10px;
`;

const DeckSection = styled.div`
    margin-top: 30px;

    h3 {
        font-size: 20px;
        margin-bottom: 10px;
    }
`;

const DeckContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 20px;
`;

const CardList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: flex-start;
`;

const CardImage = styled.img`
    width: 54px; /* 10% smaller (60px * 0.9) */
    height: 76.5px; /* 10% smaller (85px * 0.9) */
    border: 1px solid #ddd;
    border-radius: 6px;
    object-fit: cover;
`;

const ExportSection = styled.div`
    display: flex;
    gap: 10px;
    margin-top: 20px;
`;

const ExportButton = styled.button`
    padding: 8px 12px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
        background-color: #0056b3;
    }
`;

const CombosSection = styled.div`
    margin-top: 30px;

    h3 {
        font-size: 20px;
        margin-bottom: 20px;
    }
`;

const ComboCard = styled.div`
    background-color: #fff;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 15px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

    h4 {
        margin-bottom: 10px;
    }
`;

const ComboLogs = styled.div`
    margin-bottom: 10px;
`;

const LogEntry = styled.div`
    font-size: 14px;
    color: #555;
`;

const ComboActions = styled.div`
    display: flex;
    gap: 10px;
`;

const ActionButton = styled.button`
    padding: 6px 12px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
        background-color: #0056b3;
    }
`;

const ActionDeleteButton = styled.button`
    padding: 6px 12px;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
        background-color: #c82333;
    }
`;

const NewComboButton = styled.button`
    padding: 10px 15px;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
        background-color: #218838;
    }
`;

async function createComboImage(collection: YGOCollection, combo: any) {

    const cards = new Map<number, any>();

    collection.deck.mainDeck.forEach((card: any) => cards.set(card.id, card));
    collection.deck.extraDeck.forEach((card: any) => cards.set(card.id, card));

    const promises = new Map<number, Promise<any>>();

    combo.deck.mainDeck.forEach((cardId: any) => {
        if (cards.has(cardId)) return;
        if (promises.has(cardId)) return;
        promises.set(cardId, getCard(cardId));
    });

    combo.deck.mainDeck.forEach((cardId: any) => {
        if (cards.has(cardId)) return;
        if (promises.has(cardId)) return;
        promises.set(cardId, getCard(cardId));
    });

    await Promise.all(promises.values());

    const deck = {
        mainDeck: combo.deck.mainDeck.map((cardId: any) => cards.get(cardId)!),
        extraDeck: combo.deck.extraDeck.map((cardId: any) => cards.get(cardId)!),
    }

    const YGO = new YGOCore({
        players: [{
            name: "Test",
            mainDeck: deck.mainDeck,
            extraDeck: deck.extraDeck
        }],
        options: {
            shuffleDecks: false
        }
    });

    const utils = new YgoReplayToImage({ translations: {} });
    utils.setYGO(YGO);
    await utils.createImage({ logs: combo.logs, download: true });
}