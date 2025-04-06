import { useState, useEffect } from "react";
import styled from "styled-components";
import { Card } from "ygo-core";
import { useSearchParams } from "react-router-dom";
import { CollectionContext } from "./contex";
import { CurrentCollection } from "./CurrentCollection";
import short from "short-uuid";
const cdnUrl = String(import.meta.env.VITE_YGO_CDN_URL);

export interface YGOCollectionDetails {
  id: string;
  name: string;
}

export interface YGOCollection {
  id: string;
  name: string;
  deck: {
    name: string;
    mainDeck: Card[];
    extraDeck: Card[];
  };
  combos: any[];
}

export function CollectionsPage() {
  const [collections, setCollections] = useState<YGOCollectionDetails[]>(() => {
    const collections = JSON.parse(
      window.localStorage.getItem("collections_details")! || "[]"
    );
    return collections as YGOCollectionDetails[];
  });

  const [decks] = useState(() => {
    const allKeys = Object.keys(localStorage);
    const decks = allKeys.filter((key) => key.startsWith("deck_"));
    return decks;
  });

  const [collection, setCollection] = useState<YGOCollection | undefined>();
  const [searchParams] = useSearchParams();

  const changeCollection = (collectionId: string) => {
    setCollection(
      JSON.parse(window.localStorage.getItem("c_" + collectionId)!)
    );
  };

  const updateCollection = (collection: YGOCollection) => {
    const collectionInList = collections.find((c) => c.id === collection.id);

    if (collectionInList && collection.name !== collectionInList.name) {
      setCollections((prev) => {
        const nextCollections = prev.map((c) => {
          if (c.id === collection.id) {
            c.name = collection.name;
          }
          return c;
        });
        window.localStorage.setItem(
          "collections_details",
          JSON.stringify(nextCollections)
        );
        return nextCollections;
      });
    }

    setCollection({ ...collection });
    window.localStorage.setItem(
      "c_" + collection.id,
      JSON.stringify(collection)
    );
  };

  const createCollection = () => {
    const collection: YGOCollection = {
      id: short.generate(),
      name: "New Collection",
      deck: {
        name: "",
        mainDeck: [],
        extraDeck: [],
      },
      combos: [],
    };

    setCollections((prev) => {
      const collections = [
        ...prev,
        { id: collection.id, name: collection.name },
      ];
      window.localStorage.setItem(
        "c_" + collection.id,
        JSON.stringify(collection)
      );
      window.localStorage.setItem(
        "collections_details",
        JSON.stringify(collections)
      );
      return collections;
    });
  };

  const setCollectionById = (id: string) => {
    const collectionData = window.localStorage.getItem("c_" + id);
    if (collectionData) {
      setCollection(JSON.parse(collectionData));
    }
  };

  useEffect(() => {
    const selectId = searchParams.get("select");
    if (selectId) {
      changeCollection(selectId);
    }
  }, [searchParams]);

  return (
    <CollectionContext.Provider
      value={{
        decks,
        collection,
        setCollection: updateCollection,
        setCollectionById,
      }}
    >
      <PageContainer>
        <LeftPane>
          <h2>Collections</h2>
          <CollectionsList>
            {collections.map((collection) => (
              <CollectionItem
                key={collection.id}
                onClick={() => changeCollection(collection.id)}
              >
                {collection.name}
              </CollectionItem>
            ))}
          </CollectionsList>
          <AddCollectionButton onClick={createCollection}>
            Add Collection
          </AddCollectionButton>
        </LeftPane>

        <RightPane>
          {collection ? (
            <CurrentCollection />
          ) : (
            <NoCollectionMessage>
              Select a collection to view details
            </NoCollectionMessage>
          )}
        </RightPane>
      </PageContainer>
    </CollectionContext.Provider>
  );
}

// Styled Components

const PageContainer = styled.div`
  display: flex;
  flex-direction: row;
  padding: 20px;
  height: 100dvh;
  box-sizing: content-box;
`;

const LeftPane = styled.div`
  width: 250px;
  padding: 15px;
  background-color: #f4f4f4;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-right: 20px;
`;

const CollectionsList = styled.div`
  margin-top: 20px;
  display: flex;
  flex-direction: column;
`;

const CollectionItem = styled.div`
  padding: 10px;
  margin: 5px 0;
  background-color: #fff;
  border-radius: 5px;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  &:hover {
    background-color: #007bff;
    color: white;
  }
`;

const AddCollectionButton = styled.button`
  margin-top: 20px;
  padding: 10px 15px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 5px;
  width: 100%;
  cursor: pointer;

  &:hover {
    background-color: #218838;
  }
`;

const RightPane = styled.div`
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
`;

const NoCollectionMessage = styled.div`
  font-size: 18px;
  color: #888;
  text-align: center;
  margin-top: 50px;
`;
