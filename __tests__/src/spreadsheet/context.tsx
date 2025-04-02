import React from 'react';
import { YgoReplayToImage } from 'ygo-core-images-utils';
import { ComboMaker } from './hooks/use-combo';
import { UseActionsHistory } from './hooks/use-history';

export interface AppContext {
    replayUtils: YgoReplayToImage
    comboMaker: ComboMaker
    history: UseActionsHistory
}

export const Context = React.createContext<AppContext>({} as any);

export function useAppContext() {
    return React.useContext(Context);
}