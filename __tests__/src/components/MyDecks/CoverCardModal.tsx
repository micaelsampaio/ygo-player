import React, { useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { Card } from "../DeckBuilder/types";
import { YGOCardGrid } from "../UI/YGOCard";
import theme from "../../styles/theme";
import { X, Search } from "lucide-react";
import { getCardImageUrl, CARD_BACK_IMAGE } from "../../utils/cardImages";

interface CoverCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  deck: {
    name: string;
    mainDeck: Card[];
    extraDeck: Card[];
    sideDeck?: Card[];
  } | null;
  onSelectCoverCard: (cardId: number) => void;
  currentCoverId?: number;
}

const CoverCardModal: React.FC<CoverCardModalProps> = ({
  isOpen,
  onClose,
  deck,
  onSelectCoverCard,
  currentCoverId,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("main");

  if (!isOpen || !deck) return null;

  const allCards = [
    ...deck.mainDeck,
    ...deck.extraDeck,
    ...(deck.sideDeck || []),
  ];

  const filteredCards = allCards.filter((card: Card) =>
    card.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const mainDeckCards = deck.mainDeck.filter((card: Card) =>
    card.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const extraDeckCards = deck.extraDeck.filter((card: Card) =>
    card.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayCards =
    activeTab === "all"
      ? filteredCards
      : activeTab === "main"
      ? mainDeckCards
      : extraDeckCards;

  const handleCardSelect = (card: Card) => {
    onSelectCoverCard(card.id);
    onClose();
  };

  return createPortal(
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <h3>Select Cover Card for {deck.name}</h3>
          <CloseButton onClick={onClose}>
            <X size={24} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <SearchBar>
            <SearchIcon>
              <Search size={16} />
            </SearchIcon>
            <input
              type="text"
              placeholder="Search cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchBar>

          <TabsContainer>
            <TabButton
              $active={activeTab === "all"}
              onClick={() => setActiveTab("all")}
            >
              All Cards ({allCards.length})
            </TabButton>
            <TabButton
              $active={activeTab === "main"}
              onClick={() => setActiveTab("main")}
            >
              Main Deck ({deck.mainDeck.length})
            </TabButton>
            <TabButton
              $active={activeTab === "extra"}
              onClick={() => setActiveTab("extra")}
            >
              Extra Deck ({deck.extraDeck.length})
            </TabButton>
          </TabsContainer>

          <CardGridContainer>
            <StyledCardGrid gap="10px">
              {displayCards.map((card: Card, index: number) => (
                <CardContainer
                  key={`${card.id}-${index}`}
                  $selected={card.id === currentCoverId}
                  onClick={() => handleCardSelect(card)}
                >
                  <CardImage
                    src={getCardImageUrl(card.id, "small")}
                    alt={card.name}
                    title={card.name}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = CARD_BACK_IMAGE;
                    }}
                  />
                  {card.id === currentCoverId && <SelectedIndicator />}
                </CardContainer>
              ))}
            </StyledCardGrid>

            {displayCards.length === 0 && (
              <EmptyMessage>
                No cards found matching "{searchTerm}"
              </EmptyMessage>
            )}
          </CardGridContainer>
        </ModalBody>
      </ModalContent>
    </ModalOverlay>,
    document.body
  );
};

// Styled components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ModalContent = styled.div`
  background-color: white;
  border-radius: ${theme.borderRadius.lg};
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: ${theme.shadows.lg};
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      transform: translateY(30px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.border.default};

  h3 {
    margin: 0;
    color: ${theme.colors.text.primary};
    font-size: ${theme.typography.size.xl};
    font-weight: ${theme.typography.weight.semibold};
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${theme.colors.text.secondary};
  padding: ${theme.spacing.xs};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color ${theme.transitions.default};

  &:hover {
    background-color: ${theme.colors.background.light};
    color: ${theme.colors.text.primary};
  }
`;

const ModalBody = styled.div`
  padding: ${theme.spacing.lg};
  overflow-y: auto;
`;

const SearchBar = styled.div`
  position: relative;
  margin-bottom: ${theme.spacing.md};

  input {
    width: 100%;
    padding: ${theme.spacing.sm} ${theme.spacing.md} ${theme.spacing.sm} 40px;
    border: 1px solid ${theme.colors.border.default};
    border-radius: ${theme.borderRadius.md};
    font-size: ${theme.typography.size.md};
    background-color: ${theme.colors.background.light};

    &:focus {
      outline: none;
      border-color: ${theme.colors.primary.main};
      box-shadow: 0 0 0 2px ${theme.colors.primary.light};
    }
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  top: 50%;
  left: ${theme.spacing.md};
  transform: translateY(-50%);
  color: ${theme.colors.text.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const TabsContainer = styled.div`
  display: flex;
  border-bottom: 1px solid ${theme.colors.border.default};
  margin-bottom: ${theme.spacing.md};
`;

const TabButton = styled.button<{ $active: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: none;
  border: none;
  border-bottom: 3px solid
    ${(props) => (props.$active ? theme.colors.primary.main : "transparent")};
  color: ${(props) =>
    props.$active ? theme.colors.primary.main : theme.colors.text.secondary};
  font-weight: ${(props) =>
    props.$active
      ? theme.typography.weight.semibold
      : theme.typography.weight.medium};
  cursor: pointer;
  transition: all ${theme.transitions.default};

  &:hover {
    color: ${(props) =>
      props.$active ? theme.colors.primary.dark : theme.colors.text.primary};
  }
`;

const CardGridContainer = styled.div`
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: ${theme.spacing.xs};

  /* Custom scrollbar */
  scrollbar-width: thin;
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: ${theme.colors.background.light};
  }
  &::-webkit-scrollbar-thumb {
    background-color: ${theme.colors.border.default};
    border-radius: 20px;
  }
`;

const StyledCardGrid = styled(YGOCardGrid)`
  padding: ${theme.spacing.sm};
`;

const CardContainer = styled.div<{ $selected: boolean }>`
  position: relative;
  cursor: pointer;
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
  border: 3px solid
    ${(props) => (props.$selected ? theme.colors.primary.main : "transparent")};
  transition: transform ${theme.transitions.default},
    box-shadow ${theme.transitions.default};

  &:hover {
    transform: translateY(-5px);
    box-shadow: ${theme.shadows.md};
  }
`;

const CardImage = styled.img`
  width: 100%;
  display: block;
  height: auto;
`;

const SelectedIndicator = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(33, 150, 243, 0.3);
  border-radius: ${theme.borderRadius.md};
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    content: "✓";
    font-size: 48px;
    color: white;
    text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
  }
`;

const EmptyMessage = styled.div`
  padding: ${theme.spacing.lg} 0;
  text-align: center;
  color: ${theme.colors.text.secondary};
  font-style: italic;
`;

export default CoverCardModal;
