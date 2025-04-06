import React from 'react';
import { YGOCollection } from './CollectionsPage';

export interface AppCollectionContext {
    decks: string[]
    collection: YGOCollection | undefined
    setCollection: (collection: YGOCollection) => void
}

export const CollectionContext = React.createContext<AppCollectionContext>({} as any);

export function useCollectionContext() {
    return React.useContext(CollectionContext);
}