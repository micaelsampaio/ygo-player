import { ComboCol, ComboRow } from "../hooks/use-combo";
import { useAppContext } from "../context";

const cdnUrl = String(import.meta.env.VITE_YGO_CDN_URL);

export function ComboMakerData() {

    const { comboMaker, replayUtils, collectionId, createImage, addToCollection } = useAppContext();

    const addLogItem = () => {
        const log = replayUtils.dequeueLog();

        if (!log) return;

        comboMaker.addRow({ log });
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
            {collectionId && <button onClick={addToCollection}>Save to Collection</button>}
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

    if (!col.log.id) {
        return <div className="combo-maker-col">
            {col.log.type}
        </div>
    }

    const card = replayUtils.getCardData(col.log.id);

    return <div className="combo-maker-col">
        {col.log.type} - {card.name}
        <br />
        {card.id > 99999900 ? <>
            <img className='s-card-image' src={`${cdnUrl}/images/token.jpg`} style={{ height: "200px" }} />
        </> : <>
            <img className='s-card-image' src={`${cdnUrl}/images/cards_small/${card.id}.jpg`} style={{ height: "200px" }} />
        </>
        }
        <br />

    </div>
}