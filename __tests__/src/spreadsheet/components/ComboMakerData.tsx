import { ComboCol, ComboRow } from "../hooks/use-combo";
import { useAppContext } from "../context";

export function ComboMakerData() {

    const { comboMaker, replayUtils } = useAppContext();

    const addLogItem = () => {
        const log = replayUtils.dequeueLog();

        if (!log) return;

        comboMaker.addRow({
            log
        });
    }

    const createImage = async () => {
        const logs = comboMaker.createMatrix();
        await replayUtils.createImage({ logs, download: true });
    }

    const lastRow = comboMaker.rows.length - 1;

    return <div>
        <div>
            {comboMaker.rows.map((row, rowIndex) => <Row rowIndex={rowIndex} key={row.id} row={row} canAddElements={lastRow === rowIndex} />)}
        </div>

        {comboMaker.rows.length > 0 && comboMaker.rows[comboMaker.rows.length - 1].cols.length > 0 && <>
            <div>
                <button onClick={addLogItem}>Add Log Item</button>
            </div>
        </>}

        <div>
            <button onClick={createImage}>Create Image</button>
        </div>
    </div>
}

function Row({ row, rowIndex, canAddElements }: { row: ComboRow, rowIndex: number, canAddElements: boolean }) {
    const { replayUtils, comboMaker } = useAppContext();

    const addLogItem = () => {
        const log = replayUtils.dequeueLog();

        if (!log) return;
        comboMaker.addCol({
            log,
            rowIndex
        })
    }

    return <div className="combo-maker-row">
        {
            row.cols.map(col => <Col key={col.id} col={col} />)
        }
        {
            canAddElements && <div>
                <button onClick={addLogItem}>Add Log Item</button>
            </div>
        }
    </div>
}

function Col({ col }: { col: ComboCol }) {
    const { replayUtils } = useAppContext();

    const card = replayUtils.getCardData(col.log.id);

    return <div className="combo-maker-col">
        {col.log.type} - {card.name}
        <br />
        <img src={`http://localhost:8080/images/cards_small/${card.id}.jpg`} style={{ width: '100px' }} />
        <br />

    </div>
}