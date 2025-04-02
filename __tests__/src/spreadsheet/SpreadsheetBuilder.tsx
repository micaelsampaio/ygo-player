import { useReplayUtils } from './hooks/use-replay-utils';
import { Logs } from './components/Logs';
import { Context } from './context';
import { useComboMaker } from './hooks/use-combo';
import { ComboMakerData } from './components/ComboMakerData';
import styled from 'styled-components';
import { useActionsHistory } from './hooks/use-history';

export function SpreadsheetBuilder() {
    const history = useActionsHistory();
    const replayUtils = useReplayUtils();
    const comboMaker = useComboMaker({ history });

    return (
        <Page>
            <Context.Provider value={{ replayUtils, comboMaker, history }}>
                <Container>
                    <LogsContainer>
                        <Logs replayUtils={replayUtils} />
                    </LogsContainer>
                    <ContentContainer>
                        <ComboMakerData />
                    </ContentContainer>
                </Container>
            </Context.Provider>
        </Page>
    )
}

const Page = styled.div`
    margin: 0;
    padding: 0;
    max-height: 100dvh;

    .log-row {
    padding: 10px;
    border-bottom: 1px solid #EFEFEF;
    }

    .current-log {
    text-align: center;
    }

    .current-log .log-type {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    }

    .current-log .s-card-image {
    height: 200px;
    border-radius: 5px;
    }

    .next-logs {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
    align-items: center;
    justify-content: center;
    }

    .next-log-row {
    text-align: center;
    overflow: hidden;
    width: 100%;
    text-align: center;
    font-size: 10px;
    }

    .next-log-row .log-type {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    }

    .next-log-row .s-card-image {
    height: 50px;
    border-radius: 5px;
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

    .log-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    }

    .log-actions button {
    width: 100%;    
    padding: 10px 5px;
    outline: none;
    border: 0px;
    border-radius: 5px;
    background-color: #444;
    color: #FFF;
    font-weight: bold;
    text-align: center;
    }

    .log-actions button:hover:not(:disabled) {
    background-color: #555;
    cursor: pointer;
    }

    .log-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    }
`

const Container = styled.div`
    display: flex;
    max-height: 100%;
    height: 100dvh;
`

const LogsContainer = styled.div`
    flex-shrink: 1;
    width: 200px;
    height: 100%;
    overflow-y: hidden;
    padding: 10px;
    background-color: rgba(0, 0, 0, 0.8);
    color: #FFF;
`

const ContentContainer = styled.div`
    flex-grow: 1;
    width: 100%;
    height: 100%;
    overflow-y: auto;
    overflow-x: auto;
`