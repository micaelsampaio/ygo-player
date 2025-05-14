import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { X, Search, CheckCircle } from "lucide-react";
import theme from "../../styles/theme";
import { Button } from "../UI";

interface AddSetCardsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCardsFromSet: (setCode: string, options: AddSetOptions) => void;
}

interface CardSet {
  code: string;
  name: string;
  releaseDate: string;
  cardCount: number;
}

interface AddSetOptions {
  quantity: number;
  condition: string;
  includeRarities: string[];
}

const AddSetCardsDialog: React.FC<AddSetCardsDialogProps> = ({
  isOpen,
  onClose,
  onAddCardsFromSet,
}) => {
  const [sets, setSets] = useState<CardSet[]>([]);
  const [filteredSets, setFilteredSets] = useState<CardSet[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSet, setSelectedSet] = useState<CardSet | null>(null);
  const [options, setOptions] = useState<AddSetOptions>({
    quantity: 1,
    condition: "Near Mint",
    includeRarities: [
      "Common",
      "Rare",
      "Super Rare",
      "Ultra Rare",
      "Secret Rare",
    ],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSets = async () => {
      setIsLoading(true);
      try {
        // In a real implementation, we would fetch from an API
        // For now, using sample data
        setTimeout(() => {
          const sampleSets: CardSet[] = [
            {
              code: "LOB",
              name: "Legend of Blue Eyes White Dragon",
              releaseDate: "2002-03-08",
              cardCount: 126,
            },
            {
              code: "MRD",
              name: "Metal Raiders",
              releaseDate: "2002-06-26",
              cardCount: 144,
            },
            {
              code: "SRL",
              name: "Spell Ruler",
              releaseDate: "2002-09-16",
              cardCount: 104,
            },
            {
              code: "ETCO",
              name: "Eternity Code",
              releaseDate: "2020-05-01",
              cardCount: 100,
            },
            {
              code: "POTE",
              name: "Power of the Elements",
              releaseDate: "2022-08-05",
              cardCount: 100,
            },
          ];

          setSets(sampleSets);
          setFilteredSets(sampleSets);
          setIsLoading(false);
        }, 600);
      } catch (error) {
        console.error("Error fetching card sets:", error);
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchSets();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = sets.filter(
        (set) =>
          set.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          set.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSets(filtered);
    } else {
      setFilteredSets(sets);
    }
  }, [searchTerm, sets]);

  const handleSetSelect = (set: CardSet) => {
    setSelectedSet(set);
  };

  const handleOptionChange = (field: keyof AddSetOptions, value: any) => {
    setOptions((prev) => ({ ...prev, [field]: value }));
  };

  const handleRarityToggle = (rarity: string) => {
    setOptions((prev) => {
      const currentRarities = [...prev.includeRarities];
      if (currentRarities.includes(rarity)) {
        return {
          ...prev,
          includeRarities: currentRarities.filter((r) => r !== rarity),
        };
      } else {
        return { ...prev, includeRarities: [...currentRarities, rarity] };
      }
    });
  };

  const handleAddCards = () => {
    if (!selectedSet) return;
    onAddCardsFromSet(selectedSet.code, options);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <DialogOverlay>
      <DialogContainer>
        <DialogHeader>
          <h2>Add Cards from Set</h2>
          <CloseButton onClick={onClose}>
            <X size={20} />
          </CloseButton>
        </DialogHeader>

        <DialogContent>
          <SearchContainer>
            <SearchIcon>
              <Search size={16} />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Search sets by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchContainer>

          {isLoading ? (
            <LoadingMessage>Loading sets...</LoadingMessage>
          ) : (
            <>
              <SetsList>
                {filteredSets.length === 0 ? (
                  <NoResults>No sets found matching "{searchTerm}"</NoResults>
                ) : (
                  filteredSets.map((set) => (
                    <SetItem
                      key={set.code}
                      selected={selectedSet?.code === set.code}
                      onClick={() => handleSetSelect(set)}
                    >
                      <SetCode>{set.code}</SetCode>
                      <SetDetails>
                        <SetName>{set.name}</SetName>
                        <SetMeta>
                          Released: {set.releaseDate} • {set.cardCount} cards
                        </SetMeta>
                      </SetDetails>
                      {selectedSet?.code === set.code && (
                        <CheckCircle
                          size={18}
                          color={theme.colors.success.main}
                        />
                      )}
                    </SetItem>
                  ))
                )}
              </SetsList>

              {selectedSet && (
                <OptionsSection>
                  <h3>Options</h3>

                  <OptionGroup>
                    <OptionLabel>Default quantity per card:</OptionLabel>
                    <OptionInput
                      type="number"
                      min={1}
                      max={99}
                      value={options.quantity}
                      onChange={(e) =>
                        handleOptionChange(
                          "quantity",
                          parseInt(e.target.value) || 1
                        )
                      }
                    />
                  </OptionGroup>

                  <OptionGroup>
                    <OptionLabel>Default condition:</OptionLabel>
                    <OptionSelect
                      value={options.condition}
                      onChange={(e) =>
                        handleOptionChange("condition", e.target.value)
                      }
                    >
                      <option value="Mint">Mint</option>
                      <option value="Near Mint">Near Mint</option>
                      <option value="Excellent">Excellent</option>
                      <option value="Good">Good</option>
                      <option value="Played">Played</option>
                    </OptionSelect>
                  </OptionGroup>

                  <OptionGroup>
                    <OptionLabel>Include rarities:</OptionLabel>
                    <CheckboxGroup>
                      {[
                        "Common",
                        "Rare",
                        "Super Rare",
                        "Ultra Rare",
                        "Secret Rare",
                      ].map((rarity) => (
                        <CheckboxItem key={rarity}>
                          <CheckboxInput
                            type="checkbox"
                            id={`rarity-${rarity}`}
                            checked={options.includeRarities.includes(rarity)}
                            onChange={() => handleRarityToggle(rarity)}
                          />
                          <CheckboxLabel htmlFor={`rarity-${rarity}`}>
                            {rarity}
                          </CheckboxLabel>
                        </CheckboxItem>
                      ))}
                    </CheckboxGroup>
                  </OptionGroup>
                </OptionsSection>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!selectedSet || isLoading}
            onClick={handleAddCards}
          >
            Add All Cards from {selectedSet?.code}
          </Button>
        </DialogActions>
      </DialogContainer>
    </DialogOverlay>
  );
};

const DialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const DialogContainer = styled.div`
  background-color: ${theme.colors.background.paper};
  border-radius: ${theme.borderRadius.lg};
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  box-shadow: ${theme.shadows.lg};
  display: flex;
  flex-direction: column;
`;

const DialogHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.border.light};

  h2 {
    margin: 0;
    font-size: ${theme.typography.size.lg};
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.text.secondary};
  cursor: pointer;
  padding: ${theme.spacing.xs};
  border-radius: ${theme.borderRadius.sm};
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: ${theme.colors.background.hover};
    color: ${theme.colors.text.primary};
  }
`;

const DialogContent = styled.div`
  padding: ${theme.spacing.lg};
  overflow-y: auto;
  max-height: calc(90vh - 150px);
`;

const DialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.border.light};
  gap: ${theme.spacing.md};
`;

const SearchContainer = styled.div`
  position: relative;
  margin-bottom: ${theme.spacing.md};
`;

const SearchIcon = styled.div`
  position: absolute;
  left: ${theme.spacing.md};
  top: 50%;
  transform: translateY(-50%);
  color: ${theme.colors.text.secondary};
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${theme.spacing.md};
  padding-left: calc(${theme.spacing.md} * 2 + 16px);
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.size.md};

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary.main};
    box-shadow: 0 0 0 2px ${theme.colors.primary.light}50;
  }
`;

const SetsList = styled.div`
  margin-top: ${theme.spacing.md};
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.md};
  max-height: 300px;
  overflow-y: auto;
`;

const SetItem = styled.div<{ selected: boolean }>`
  display: flex;
  align-items: center;
  padding: ${theme.spacing.md};
  cursor: pointer;
  background-color: ${(props) =>
    props.selected ? `${theme.colors.primary.light}30` : "transparent"};
  border-bottom: 1px solid ${theme.colors.border.light};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: ${(props) =>
      props.selected
        ? `${theme.colors.primary.light}30`
        : theme.colors.background.hover};
  }
`;

const SetCode = styled.div`
  font-weight: bold;
  min-width: 60px;
  color: ${theme.colors.primary.main};
`;

const SetDetails = styled.div`
  flex: 1;
`;

const SetName = styled.div`
  font-weight: 500;
`;

const SetMeta = styled.div`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.secondary};
  margin-top: ${theme.spacing.xs};
`;

const NoResults = styled.div`
  padding: ${theme.spacing.lg};
  text-align: center;
  color: ${theme.colors.text.secondary};
`;

const LoadingMessage = styled.div`
  padding: ${theme.spacing.lg};
  text-align: center;
  color: ${theme.colors.text.secondary};
`;

const OptionsSection = styled.div`
  margin-top: ${theme.spacing.lg};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border.light};

  h3 {
    margin-top: 0;
    margin-bottom: ${theme.spacing.md};
    font-size: ${theme.typography.size.md};
  }
`;

const OptionGroup = styled.div`
  margin-bottom: ${theme.spacing.md};
`;

const OptionLabel = styled.div`
  margin-bottom: ${theme.spacing.xs};
  font-weight: 500;
`;

const OptionInput = styled.input`
  padding: ${theme.spacing.sm};
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.md};
  width: 80px;
`;

const OptionSelect = styled.select`
  padding: ${theme.spacing.sm};
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.md};
  min-width: 150px;
`;

const CheckboxGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.sm};
`;

const CheckboxItem = styled.div`
  display: flex;
  align-items: center;
`;

const CheckboxInput = styled.input`
  margin-right: ${theme.spacing.xs};
`;

const CheckboxLabel = styled.label`
  font-size: ${theme.typography.size.sm};
`;

export default AddSetCardsDialog;
