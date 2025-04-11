import { useState } from 'react';
import { YgoReplayToImage } from 'ygo-core-images-utils';
import { useAppContext } from '../context';
import { HistoryCommand } from '../hooks/use-history';

const cdnUrl = String(import.meta.env.VITE_YGO_CDN_URL);

export function Logs({ replayUtils }: { replayUtils: YgoReplayToImage }) {
    const { history, comboMaker } = useAppContext();
    const [, render] = useState(Date.now());

    const removeLog = (log: any) => {
        replayUtils.removeLog(log);
        render(Date.now());
    }

    const addCol = (log: any) => {
        const historyCommand = new HistoryCommand({
            exec: () => replayUtils.removeLog(log),
            undo: () => replayUtils.insertLogAtHead(log),
        });
        comboMaker.addCol({ log, rowIndex: comboMaker.rows.length - 1, cmd: historyCommand });
    }

    const addRow = (log: any) => {
        const historyCommand = new HistoryCommand({
            exec: () => replayUtils.removeLog(log),
            undo: () => replayUtils.insertLogAtHead(log),
        });
        comboMaker.addRow({ log, cmd: historyCommand });
    }

    const logs = replayUtils.logs
    const currentLog = logs[0];
    const card = currentLog && replayUtils.getCardData(currentLog.id);
    const minLog = logs.length > 1 ? 1 : 0;
    const maxLog = Math.min(3, logs.length - 1);
    const nextLogs = [];

    for (let i = minLog; i <= maxLog; ++i) {
        const log = logs[i];

        if (log.id) {
            const card = replayUtils.getCardData(log.id);
            nextLogs.push(<>
                <div className='next-log-row'>
                    <div className="log-type">
                        {log.type}
                    </div>
                    {card.id > 99999900 ? <>
                        <img className='s-card-image' src={`${cdnUrl}/images/token.jpg`} />
                    </> : <>
                        <img className='s-card-image' src={`${cdnUrl}/images/cards_small/${card.id}.jpg`} />
                    </>
                    }

                </div>
            </>)
        } else {
            nextLogs.push(<>
                <div className='next-log-row'>
                    <div className="log-type">
                        {log.type}
                    </div>
                    <img className='s-card-image no-image' />
                </div>
            </>)
        }
    }

    return <div>
        <div className='log-rows'>

            <div>
                <button disabled={!history.hasUndo} onClick={history.undo}>Undo</button>
                <button disabled={!history.hasRedo} onClick={history.redo}>Redo</button>
            </div>

            {currentLog && currentLog.id && card && <>
                <div className='current-log'>
                    <div className="log-type">
                        {currentLog.type}
                    </div>

                    {card.id > 99999900 ? <>
                        <img className='s-card-image' src={`${cdnUrl}/images/token.jpg`} />
                    </> : <>
                        <img className='s-card-image' src={`${cdnUrl}/images/cards_small/${card.id}.jpg`} />
                    </>
                    }

                    <br />
                </div>
            </>}

            {currentLog && !card && <>
                <div className='current-log'>
                    <div className="log-type">
                        {currentLog.type}
                    </div>

                    <img className='s-card-image no-image' />

                    <br />
                </div>
            </>}

            <div className="next-logs">
                {nextLogs}
            </div>

            <div className='log-actions'>
                <button disabled={comboMaker.rows.length === 0} onClick={() => addCol(currentLog)}>Add to Column</button>
                <button onClick={() => addRow(currentLog)}>Add new Row</button>
                <button onClick={() => removeLog(currentLog)}>Delete</button>
            </div>



            {/* {replayUtils.logs && replayUtils.logs.map(log => {
                if (!log.id) return null;
                const card = replayUtils.getCardData(log.id);
                return <div className='log-row'>
                    {log.type} - {card.name}
                    <br />
                    <img src={`http://localhost:8080/images/cards_small/${card.id}.jpg`} style={{ width: '100px' }} />
                    <br />

                    <div>
                        <button onClick={() => removeLog(log)}>delete</button>
                    </div>
                </div>
            })} */}

        </div>
    </div>
}