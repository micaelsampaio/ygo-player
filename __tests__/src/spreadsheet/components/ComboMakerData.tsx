import { ComboCol, ComboRow } from "../hooks/use-combo";
import { useAppContext } from "../context";
import { memo } from "react";

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
        <div className="pl-6">
            <div className="flex flex-col gap-4">
                {comboMaker.rows.map((row, rowIndex) => <Row rowIndex={rowIndex} key={row.id} row={row} canAddElements={lastRow === rowIndex} />)}
            </div>
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
        <div className="flex gap-4">
            {
                row.cols.map(col => <Col key={col.id} col={col} />)
            }
        </div>
        {/* {
            canAddElements && <div>
                <button onClick={addLogItem}>Add Log Item</button>
            </div>
        } */}
    </div>
}

const Col = memo(function ColComponent({ col }: { col: ComboCol }) {
    const { replayUtils } = useAppContext();
    console.log("COL ", col);
    const baseCardClass = `combo-maker-col py-4 px-6 bg-white shadow rounded-md flex-shrink-0 ${col.log.player === 1 ? `border-2 border-red-400 border-solid` : ""}`;

    if (col.log.type === "Start Hand") {
        return <div className={`${baseCardClass}`}>
            <div className="font-bold text-center">
                <div className="font-bold text-center mb-2">
                    {col.log.type}
                </div>
                <div className="flex gap-2">
                    {Array.isArray(col.log.cards) && col.log.cards.map((card: any) => <LogCard id={card.id} />)}
                </div>
            </div>
        </div>
    }

    console.log("COL ", col);

    if (col.log.type === "EndField") {
        return <div className={`${baseCardClass}`}>
            <div className="font-bold text-center">
                <div className="font-bold text-center mb-2">
                    {col.log.type}
                </div>
                <div className="flex gap-2">
                    {Array.isArray(col.log.endField) && col.log.endField.map((card: any) => <LogCard id={card.id} />)}
                </div>
            </div>
        </div>
    }

    if (!col.log.id) {
        return <div className={`${baseCardClass}`}>
            <div className="font-bold text-center">
                {col.log.type}
            </div>
        </div>
    }

    const card = replayUtils.getCardData(col.log.id);

    return <div className={`${baseCardClass}`}>
        <div className="font-bold text-center mb-2">
            {col.log.type}
        </div>
        <LogCard id={card.id} />
    </div>
});

function LogCard({ id }: { id: number }) {
    return <>
        {id > 99999900 ? <>
            <img className='s-card-image h-50 w-[137px] rounded-md' src={`${cdnUrl}/images/token.jpg`} />
        </> : <>
            <img className='s-card-image h-50 w-[137px] rounded-md' src={`${cdnUrl}/images/cards_small/${id}.jpg`} />
        </>
        }
    </>
}