import React from 'react';
import { YgoReplayToImage } from 'ygo-core-images-utils';
import { ComboMaker } from './hooks/use-combo';
import { UseActionsHistory } from './hooks/use-history';

export interface AppContext {
    collectionId: string | undefined,
    comboId: string | undefined,
    replayUtils: YgoReplayToImage
    comboMaker: ComboMaker
    history: UseActionsHistory
    createImage: () => Promise<void>
    createImageNewTab: () => Promise<void>
    addToCollection: () => void
}

export const Context = React.createContext<AppContext>({} as any);

export function useAppContext() {
    return React.useContext(Context);
}