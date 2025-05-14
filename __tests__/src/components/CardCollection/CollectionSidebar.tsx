import React from "react";
import styled from "styled-components";
import { PlusCircle, Database } from "lucide-react";
import theme from "../../styles/theme";

interface Collection {
  id: string;
  name: string;
  description: string;
  cardCount: number;
  value?: number;
  lastModified: string;
}

interface CollectionSidebarProps {
  collections: Collection[];
  activeCollectionId: string | null;
  onSelectCollection: (collectionId: string) => void;
  onCreateCollection: () => void;
  isLoading: boolean;
}

const CollectionSidebar: React.FC<CollectionSidebarProps> = ({
  collections,
  activeCollectionId,
  onSelectCollection,
  onCreateCollection,
  isLoading,
}) => {
  return (
    <SidebarContainer>
      <SidebarHeader>
        <SidebarTitle>Collections</SidebarTitle>
        <NewCollectionButton onClick={onCreateCollection}>
          <PlusCircle size={16} />
        </NewCollectionButton>
      </SidebarHeader>

      {isLoading ? (
        <LoadingState>Loading...</LoadingState>
      ) : collections.length > 0 ? (
        <CollectionList>
          {collections.map((collection) => (
            <CollectionItem
              key={collection.id}
              active={collection.id === activeCollectionId}
              onClick={() => onSelectCollection(collection.id)}
            >
              <CollectionIcon>
                <Database size={16} />
              </CollectionIcon>
              <CollectionDetails>
                <CollectionName>{collection.name}</CollectionName>
                <CollectionMeta>
                  {collection.cardCount} cards
                  {collection.value && ` • $${collection.value.toFixed(2)}`}
                </CollectionMeta>
              </CollectionDetails>
            </CollectionItem>
          ))}
        </CollectionList>
      ) : (
        <EmptyState>
          No collections yet. Create your first collection to get started.
        </EmptyState>
      )}

      <SidebarFooter>
        <CreateCollectionButton onClick={onCreateCollection}>
          <PlusCircle size={14} />
          New Collection
        </CreateCollectionButton>
      </SidebarFooter>
    </SidebarContainer>
  );
};

const SidebarContainer = styled.div`
  width: 260px;
  flex-shrink: 0;
  background: ${theme.colors.background.paper};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.sm};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const SidebarHeader = styled.div`
  padding: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SidebarTitle = styled.h3`
  margin: 0;
  font-size: ${theme.typography.size.md};
  color: ${theme.colors.text.primary};
`;

const NewCollectionButton = styled.button`
  background: transparent;
  border: none;
  color: ${theme.colors.primary.main};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xs};
  border-radius: ${theme.borderRadius.full};
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${theme.colors.background.hover};
  }
`;

const CollectionList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing.sm} 0;
`;

const CollectionItem = styled.div<{ active: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  background: ${(props) =>
    props.active ? `${theme.colors.primary.main}15` : "transparent"};
  border-left: 3px solid
    ${(props) => (props.active ? theme.colors.primary.main : "transparent")};
  transition: background-color 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: ${(props) =>
      props.active
        ? `${theme.colors.primary.main}15`
        : theme.colors.background.hover};
  }
`;

const CollectionIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.background.default};
  color: ${theme.colors.text.secondary};
`;

const CollectionDetails = styled.div`
  flex: 1;
  overflow: hidden;
`;

const CollectionName = styled.div`
  font-weight: ${theme.typography.weight.medium};
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CollectionMeta = styled.div`
  font-size: ${theme.typography.size.xs};
  color: ${theme.colors.text.secondary};
  margin-top: 2px;
`;

const SidebarFooter = styled.div`
  padding: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border.light};
`;

const CreateCollectionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  width: 100%;
  padding: ${theme.spacing.sm};
  border: 1px dashed ${theme.colors.border.main};
  background: transparent;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.sm};
  border-radius: ${theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${theme.colors.primary.main};
    color: ${theme.colors.primary.main};
    background: ${theme.colors.background.hover};
  }
`;

const LoadingState = styled.div`
  padding: ${theme.spacing.lg};
  text-align: center;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.sm};
`;

const EmptyState = styled.div`
  padding: ${theme.spacing.md};
  text-align: center;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.sm};
`;

export default CollectionSidebar;
