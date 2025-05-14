import React, { useState } from "react";
import styled from "styled-components";
import {
  Search,
  Filter,
  SortAsc,
  Upload,
  Download,
  MoreHorizontal,
} from "lucide-react";
import theme from "../../styles/theme";
import { Button, Dropdown, DropdownItem, TextField } from "../UI";
import CSVImport from "./CSVImport";
import CSVExport from "./CSVExport";
import { CSVCardData } from "../../utils/csv-handler";

interface CardCollectionHeaderProps {
  collectionName: string;
  totalCards: number;
  totalQuantity: number;
  onSearch: (query: string) => void;
  onSort: (sortType: string) => void;
  onFilter: () => void;
  cards: CSVCardData[];
  onImportCards?: (cards: CSVCardData[]) => void;
}

const CardCollectionHeader: React.FC<CardCollectionHeaderProps> = ({
  collectionName,
  totalCards,
  totalQuantity,
  onSearch,
  onSort,
  onFilter,
  cards,
  onImportCards,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearch(searchQuery);
    }
  };

  const handleImportCards = (importedCards: CSVCardData[]) => {
    if (onImportCards) {
      onImportCards(importedCards);
    }
  };

  return (
    <HeaderContainer>
      <TitleSection>
        <div>
          <Title>{collectionName}</Title>
          <Stats>
            {totalCards} {totalCards === 1 ? "card" : "cards"} ({totalQuantity}{" "}
            total)
          </Stats>
        </div>
      </TitleSection>

      <SearchSection>
        <SearchWrapper>
          <SearchIconWrapper>
            <Search size={18} />
          </SearchIconWrapper>
          <SearchInput
            type="text"
            placeholder="Search cards..."
            value={searchQuery}
            onChange={handleSearch}
            onKeyDown={handleKeyDown}
          />
        </SearchWrapper>
      </SearchSection>

      <ActionSection>
        <ActionButton
          variant="secondary"
          icon={<SortAsc size={16} />}
          onClick={() => onSort("name")}
        >
          Sort
        </ActionButton>

        <ActionButton
          variant="secondary"
          icon={<Filter size={16} />}
          onClick={onFilter}
        >
          Filter
        </ActionButton>

        <Dropdown
          trigger={
            <ActionButton
              variant="secondary"
              icon={<MoreHorizontal size={16} />}
            >
              More
            </ActionButton>
          }
        >
          <DropdownItem
            icon={<Upload size={16} />}
            onClick={() => setIsImportModalOpen(true)}
          >
            Import CSV
          </DropdownItem>
          <DropdownItem
            icon={<Download size={16} />}
            onClick={() => setIsExportModalOpen(true)}
          >
            Export CSV
          </DropdownItem>
        </Dropdown>
      </ActionSection>

      <CSVImport
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportCards}
        collectionName={collectionName}
      />

      <CSVExport
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        cards={cards}
        collectionName={collectionName}
      />
    </HeaderContainer>
  );
};

const HeaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding-bottom: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.border.main};
  margin-bottom: ${theme.spacing.lg};

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
  }
`;

const TitleSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
`;

const Title = styled.h2`
  margin: 0;
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.xl};
`;

const Stats = styled.div`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.sm};
`;

const SearchSection = styled.div`
  flex: 2;
  max-width: 400px;
`;

const SearchWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const SearchIconWrapper = styled.div`
  position: absolute;
  top: 0;
  left: ${theme.spacing.md};
  height: 100%;
  display: flex;
  align-items: center;
  color: ${theme.colors.text.secondary};
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${theme.spacing.sm} ${theme.spacing.md} ${theme.spacing.sm}
    ${theme.spacing.xl3};
  border: 1px solid ${theme.colors.border.main};
  border-radius: ${theme.borderRadius.md};
  background-color: ${theme.colors.background.default};
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.md};

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary.main};
    box-shadow: 0 0 0 2px ${theme.colors.primary.subtle};
  }
`;

const ActionSection = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: flex-end;
`;

const ActionButton = styled(Button)`
  white-space: nowrap;
`;

export default CardCollectionHeader;
