import { ComboCol, ComboRow } from "../hooks/use-combo";
import { useAppContext } from "../context";
import { memo, useLayoutEffect, useRef, useState } from "react";
import { Button } from "../../components/UI";

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
            <div className="relative"></div>
            <div className="flex flex-col gap-4">
                {comboMaker.rows.map((row, rowIndex) => <Row rowIndex={rowIndex} key={row.id} row={row} canAddElements={lastRow === rowIndex} />)}
            </div>
        </div>

        {/* {comboMaker.rows.length > 0 && comboMaker.rows[comboMaker.rows.length - 1].cols.length > 0 && <>
            <div>
                <button onClick={addLogItem}>Add Log Item</button>
            </div>
        </>}

        <div>
            <button onClick={createImage}>Create Image</button>
            {collectionId && <button onClick={addToCollection}>Save to Collection</button>}
        </div> */}
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
                row.cols.map((col, colIndex) => <Col key={col.id} rowIndex={rowIndex} colIndex={colIndex} col={col} />)
            }
        </div>
        {/* {
            canAddElements && <div>
                <button onClick={addLogItem}>Add Log Item</button>
            </div>
        } */}
    </div>
}


const Col = memo(function ColComponent(props: { rowIndex: number, colIndex: number, col: ComboCol }) {
    const [showControls, setShowControls] = useState(false);

    return <div
        className={`combo-maker-col relative py-4 px-6 bg-white shadow rounded-md shrink-0 text-center border-2 border-transparent border-solid ${showControls ? "shadow-md shadow-blue-300" : props.col?.log?.player === 1 ? `border-red-400` : ""}`}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
    >
        <ColRender {...props} />

        {showControls && <LogCardControls colIndex={props.colIndex} rowIndex={props.rowIndex} />}
    </div>
})

const ColRender = memo(function ColComponent({ col, rowIndex, colIndex }: { rowIndex: number, colIndex: number, col: ComboCol }) {
    const { replayUtils } = useAppContext();


    if (col.log.type === "Start Hand") {
        return <div className="font-bold text-center">
            <div className="font-bold text-center mb-2">
                {col.log.type}
            </div>
            <div className="flex gap-2">
                {Array.isArray(col.log.cards) && col.log.cards.map((card: any) => <LogCard id={card.id} />)}
            </div>
        </div>
    }

    if (col.log.type === "EndField") {
        return <div className="font-bold text-center">
            <div className="font-bold text-center mb-2">
                {col.log.type}
            </div>
            <div className="flex gap-2">
                {Array.isArray(col.log.endField) && col.log.endField.map((card: any) => <LogCard id={card.id} />)}
            </div>
        </div>
    }

    if (!col.log.id) {
        return <div className="font-bold text-center">
            {col.log.type}
        </div>
    }

    const card = replayUtils.getCardData(col.log.id);

    return <div>
        <div className="font-bold text-center mb-2">
            {col.log.type}
        </div>
        <LogCard id={card.id} />
    </div>
})

function LogCard({ id }: { id: number }) {
    return <>
        {id > 99999900 ? <>
            <img className='s-card-image h-30 rounded-md m-auto' src={`${cdnUrl}/images/token.jpg`} />
        </> : <>
            <img className='s-card-image h-30 rounded-md m-auto' src={`${cdnUrl}/images/cards_small/${id}.jpg`} />
        </>
        }
    </>
}

function LogCardControls({ rowIndex, colIndex }: { rowIndex: number, colIndex: number }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { comboMaker } = useAppContext();

    const deleteLogItemFromCombo = () => {
        comboMaker.removeCol({ rowIndex, colIndex });
    }

    return (
        <div className="absolute top-1 right-1 z-50"
            ref={containerRef}
        >
            <div
                className="bg-gray-100 p-4 rounded shadow-md"
            >
                <Button variant="danger" onClick={deleteLogItemFromCombo}>Delete</Button>
            </div>
        </div>
    );
}
