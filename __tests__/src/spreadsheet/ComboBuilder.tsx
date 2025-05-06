import { useReplayUtils } from './hooks/use-replay-utils';
import { Logs } from './components/Logs';
import { Context } from './context';
import { useComboMaker } from './hooks/use-combo';
import { ComboMakerData } from './components/ComboMakerData';
import styled from 'styled-components';
import { useActionsHistory } from './hooks/use-history';
import { useParams } from 'react-router-dom';
import AppLayout from '../components/Layout/AppLayout';

export function ComboBuilder() {
    const { replayId = "" } = useParams();
    const { collectionId, comboId } = useParams();
    const history = useActionsHistory();
    const { replayUtils, isLoading } = useReplayUtils(replayId);
    const comboMaker = useComboMaker({ history });

    const createImage = async () => {
        const logs = comboMaker.createMatrix();
        await replayUtils.createImage({ logs, download: true });
    }

    const createImageNewTab = async () => {
        const logs = comboMaker.createMatrix();
        const blob = await replayUtils.createImage({ logs, download: false });

        if (!blob) return;

        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');

        setTimeout(() => URL.revokeObjectURL(url), 10000);
    };

    const addToCollection = () => {
        const logs = comboMaker.createMatrix();
        const collectionKey = `c_${collectionId}`;
        const replayData = JSON.parse(localStorage.getItem("duel-data")!);
        const deck = replayData.players[0];

        const searchParams = new URLSearchParams(window.location.search);

        const comboName = prompt("Combo name", searchParams.get("name") || "");

        if (!comboName) return alert("combo name cant be empty");

        const collectionCombo = {
            id: comboId,
            name: comboName,
            collection: collectionId,
            deck: {
                mainDeck: deck.mainDeck.map((c: any) => c.id),
                extraDeck: deck.extraDeck.map((c: any) => c.id),
            },
            hand: [],
            field: [],
            logs
        }

        const collection = JSON.parse(window.localStorage.getItem(collectionKey)!);
        const collectionComboIndex = collection.combos.findIndex((c: any) => c.id === comboId);
        const index = collectionComboIndex >= 0 ? collectionComboIndex : collection.combos.length;
        collection.combos[index] = collectionCombo;

        console.log("TCL: ", collection);
        console.log("TCL: INDEX", index);

        window.localStorage.setItem(collectionKey, JSON.stringify(collection));
    }

    return (
        <AppLayout>
            <Page>
                <Context.Provider value={{ replayUtils, comboMaker, history, createImage, createImageNewTab, addToCollection, collectionId, comboId }}>

                    {isLoading && <div>Loading</div>}
                    {!isLoading && <>
                        <Container>
                            <LogsContainer className='shrink-0 w-[200px] max-w-[200px] min-w-[200px]'>
                                <Logs replayUtils={replayUtils} />
                            </LogsContainer>
                            <ContentContainer>
                                <ComboMakerData />
                            </ContentContainer>
                        </Container>
                    </>}
                </Context.Provider>
            </Page>
        </AppLayout>
    )
}

const Page = styled.div`
    margin: 0;
    padding: 0;
    height: calc(100dvh - 150px);    

    .log-row {
        padding: 10px;
        border-bottom: 1px solid #EFEFEF;
    }

    .current-log {
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding-bottom: 20px;
    }

    .current-log .log-type {
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
    }

    .current-log .s-card-image {
        height: 200px;
        border-radius: 6px;
        border: 2px solid transparent;
    }
    
    .current-log.player-1 .s-card-image {
        border: 2px solid red;
    }

    .current-log .s-card-image.no-image {
        background-color: black;
        width: 150px;
    }

    .next-logs {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 10px;
        align-items: center;
        justify-content: center;
        padding-bottom: 20px;
        flex-grow: 1;
        overflow: hidden;
    }

    .next-log-row {
        text-align: center;
        overflow: hidden;
        width: 100%;
        text-align: center;
        font-size: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .next-log-row .log-type {
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
    }

    .next-log-row .s-card-image {
        height: 50px;
        border-radius: 5px;
        border: 2px solid transparent;
    }

    .next-log-row .s-card-image {
        height: 50px;
        width: 35px;
    }

    .next-log-row .s-card-image.no-image {
        background-color: black;
    }

    .next-log-row.player-1 .s-card-image {
        border: 2px solid red;
    }


    .content {
        flex-grow: 1;
        width: 100%;
        height: 100%;
        overflow-y: auto;
        overflow-x: auto;
    }

    .content .item {
    padding: 10px;
    }

    .logs-container>*:first-child {
    background-color: yellow;
    }

    .combo-maker-row {
    display: flex;
    gap: 10px;
    border-bottom: 1px solid #EFEFEF;
    }
`

const Container = styled.div`
    display: flex;
    max-height: 100%;
    height: 100dvh;
`

const LogsContainer = styled.div`
    flex-shrink: 0;
    min-width: 200px;
    width: 200px;
    height: 100%;
    overflow-y: hidden;
    padding: 10px;
    background-color: #ffffff;
    border-radius: 0.5rem;
    border: none;
    width: auto;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1),0 1px 2px rgba(0, 0, 0, 0.06);
    transition: box-shadow 0.2s ease;
    color: #222;
`

const ContentContainer = styled.div`
    flex-grow: 1;
    width: 100%;
    height: 100%;
    overflow-y: auto;
    overflow-x: auto;
`