import { useState } from 'react';
import { YgoReplayToImage } from 'ygo-core-images-utils';
import { useAppContext } from '../context';
import { HistoryCommand } from '../hooks/use-history';
import { Button } from '../../components/UI';

const cdnUrl = String(import.meta.env.VITE_YGO_CDN_URL);

export function Logs({ replayUtils }: { replayUtils: YgoReplayToImage }) {
    const { history, comboMaker, createImageNewTab } = useAppContext();
    const [, render] = useState(Date.now());

    const removeLog = (log: any) => {
        const historyCommand = new HistoryCommand({
            exec: () => replayUtils.removeLog(log),
            undo: () => replayUtils.insertLogAtHead(log),
        });
        history.append(historyCommand);
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
    const hasLogs = replayUtils.logs.length > 0;

    for (let i = minLog; i <= maxLog; ++i) {
        const log = logs[i];
        const player = log.player;

        if (log.id) {
            const card = replayUtils.getCardData(log.id);
            nextLogs.push(<>
                <div className={`next-log-row player-${player}`}>
                    <div className="log-type font-bold">
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
                <div className={`next-log-row player-${player}`}>
                    <div className="log-type">
                        {log.type}
                    </div>
                    <img className='s-card-image no-image' />
                </div>
            </>)
        }
    }

    return <div className='log-rows h-full flex flex-col gap-2'>

        <div className="h-86">

            {currentLog && currentLog.id && card && <>
                <div className={`current-log player-${currentLog.player}`}>
                    <div className="log-type font-bold">
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
                <div className={`current-log player-${currentLog.player}`}>
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

        </div>

        <div className='flex mb-6 gap-2'>
            <Button
                className='grow'
                variant="secondary"
                size="md"
                disabled={!history.hasUndo}
                onClick={history.undo}
            >
                ⬅️ Undo
            </Button>

            <Button
                className='grow'
                variant="secondary"
                size="md"
                disabled={!history.hasRedo}
                onClick={history.redo}
            >
                Redo ➡️
            </Button>
        </div>
        <div className='flex flex-col gap-2'>
            <Button className='grow'
                variant="primary"
                size="md"
                disabled={!hasLogs || comboMaker.rows.length === 0} onClick={() => addCol(currentLog)}>
                Add to Column
            </Button>
            <Button disabled={!hasLogs} onClick={() => addRow(currentLog)}>Add new Row</Button>
            <Button disabled={!hasLogs} className='mt-6' variant='danger' onClick={() => removeLog(currentLog)}>Delete Log</Button>
        </div>

        <div className="grow flex flex-col gap-2 justify-end">
            <Button onClick={createImageNewTab}>Create Image</Button>
            <Button onClick={() => addRow(currentLog)}>Save Combo in Replay</Button>
        </div>
    </div>
}