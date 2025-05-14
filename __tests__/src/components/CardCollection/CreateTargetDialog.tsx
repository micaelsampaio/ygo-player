import React, { useState, useEffect } from "react";
import styled from "styled-components";
import {
  X,
  BarChart2,
  BookOpen,
  ListChecks,
  Search,
  Loader,
} from "lucide-react";
import theme from "../../styles/theme";
import { Button, TextField, Modal } from "../UI";
import axios from "axios";
import { toast } from "react-hot-toast";

interface CreateTargetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (targetData: any) => void;
}

interface CardSet {
  id: string;
  set_name: string;
  set_code: string;
  num_of_cards: number;
  tcg_date?: string;
}

interface Deck {
  id: string;
  name: string;
  mainDeck: any[];
  extraDeck: any[];
  sideDeck?: any[];
  description?: string;
}

const CreateTargetDialog: React.FC<CreateTargetDialogProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [targetType, setTargetType] = useState<"set" | "deck">("set");
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    selectedItemId: "",
    targetType: "one_of_each",
  });
  const [cardSets, setCardSets] = useState<CardSet[]>([]);
  const [userDecks, setUserDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchCardSets = async () => {
      if (step === 2 && targetType === "set") {
        setIsLoading(true);
        try {
          const response = await axios.get(
            "https://db.ygoprodeck.com/api/v7/cardsets.php"
          );
          const setsWithIds = response.data.map((set: any, index: number) => ({
            ...set,
            id: `set-${index}`,
          }));
          setCardSets(setsWithIds);
        } catch (error) {
          console.error("Error fetching card sets:", error);
          toast.error("Failed to load card sets. Please try again.");
          setCardSets([]);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchCardSets();
  }, [step, targetType]);

  useEffect(() => {
    const fetchUserDecks = () => {
      if (step === 2 && targetType === "deck") {
        setIsLoading(true);
        try {
          const decks: Deck[] = [];
          const allKeys = Object.keys(localStorage);
          const deckKeys = allKeys.filter(
            (key) => key.startsWith("deck_") && !key.includes("deck_groups")
          );

          for (const key of deckKeys) {
            try {
              const deckData = JSON.parse(localStorage.getItem(key) || "{}");
              if (deckData.mainDeck) {
                if (!deckData.id) {
                  deckData.id = key;
                }

                if (!deckData.name) {
                  deckData.name = key.replace("deck_", "");
                }

                decks.push(deckData);
              }
            } catch (error) {
              console.error(`Error parsing deck ${key}:`, error);
            }
          }

          setUserDecks(decks);
        } catch (error) {
          console.error("Error fetching user decks:", error);
          toast.error("Failed to load your decks. Please try again.");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchUserDecks();
  }, [step, targetType]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    let selectedItem;
    if (targetType === "set") {
      selectedItem = cardSets.find((s) => s.id === formData.selectedItemId);
    } else {
      selectedItem = userDecks.find((d) => d.id === formData.selectedItemId);
    }

    if (!selectedItem) {
      toast.error("Please select a valid item first");
      return;
    }

    // Get the total cards count properly based on item type
    const totalCards =
      targetType === "set"
        ? (selectedItem as CardSet).num_of_cards
        : [
            ...((selectedItem as Deck).mainDeck || []),
            ...((selectedItem as Deck).extraDeck || []),
            ...((selectedItem as Deck).sideDeck || []),
          ].length;

    const targetData = {
      id: `target-${Date.now()}`,
      name:
        formData.name ||
        (targetType === "set"
          ? (selectedItem as CardSet).set_name
          : (selectedItem as Deck).name),
      type: targetType,
      description: formData.description,
      progress: 0,
      total: totalCards,
      targetType: formData.targetType,
      createdAt: new Date().toISOString().split("T")[0],
      lastUpdated: new Date().toISOString().split("T")[0],
      sourceData: selectedItem,
      cards: [], // Initialize with empty cards array
    };

    console.log("Creating target:", targetData);

    try {
      onSave(targetData);
      toast.success("Collection target created successfully!");
      onClose();

      // Reset form
      setFormData({
        name: "",
        description: "",
        selectedItemId: "",
        targetType: "one_of_each",
      });
      setSearchTerm("");
      setStep(1);
    } catch (error) {
      console.error("Error creating target:", error);
      toast.error("Failed to create collection target. Please try again.");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const nextStep = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const getFilteredItems = () => {
    const items = targetType === "set" ? cardSets : userDecks;
    if (!searchTerm) return items;

    return items.filter((item) => {
      if (targetType === "set") {
        const set = item as CardSet;
        return (
          set.set_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          set.set_code.toLowerCase().includes(searchTerm.toLowerCase())
        );
      } else {
        const deck = item as Deck;
        return (
          deck.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (deck.description &&
            deck.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
    });
  };

  // Helper function to get card count for a deck safely
  const getCardCount = (deck: Deck) => {
    const mainCount = Array.isArray(deck.mainDeck) ? deck.mainDeck.length : 0;
    const extraCount = Array.isArray(deck.extraDeck)
      ? deck.extraDeck.length
      : 0;
    const sideCount = Array.isArray(deck.sideDeck) ? deck.sideDeck.length : 0;
    return mainCount + extraCount + sideCount;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>
          {step === 1 && "Create Collection Target"}
          {step === 2 && `Select ${targetType === "set" ? "Card Set" : "Deck"}`}
          {step === 3 && "Set Target Details"}
        </DialogTitle>
        <CloseButton onClick={onClose}>
          <X size={20} />
        </CloseButton>
      </DialogHeader>

      <DialogContent>
        {step === 1 && (
          <>
            <TypeSelectionText>
              What type of target do you want to create?
            </TypeSelectionText>
            <TargetTypeContainer>
              <TargetTypeOption
                selected={targetType === "set"}
                onClick={() => setTargetType("set")}
              >
                <TargetTypeIcon>
                  <BookOpen size={24} />
                </TargetTypeIcon>
                <TargetTypeName>Card Set</TargetTypeName>
                <TargetTypeDescription>
                  Track your progress toward completing a specific card set
                </TargetTypeDescription>
              </TargetTypeOption>

              <TargetTypeOption
                selected={targetType === "deck"}
                onClick={() => setTargetType("deck")}
              >
                <TargetTypeIcon>
                  <ListChecks size={24} />
                </TargetTypeIcon>
                <TargetTypeName>Deck</TargetTypeName>
                <TargetTypeDescription>
                  Create a want list for cards needed to complete a specific
                  deck
                </TargetTypeDescription>
              </TargetTypeOption>
            </TargetTypeContainer>
          </>
        )}

        {step === 2 && (
          <>
            <SearchContainer>
              <SearchIcon>
                <Search size={16} />
              </SearchIcon>
              <SearchInput
                placeholder={`Search ${
                  targetType === "set" ? "card sets" : "decks"
                }...`}
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </SearchContainer>

            {isLoading ? (
              <LoadingContainer>
                <Loader size={32} className="spinner" />
                <LoadingText>
                  Loading {targetType === "set" ? "card sets" : "decks"}...
                </LoadingText>
              </LoadingContainer>
            ) : getFilteredItems().length === 0 ? (
              <EmptyState>
                {targetType === "set" ? (
                  <>No card sets found matching "{searchTerm}"</>
                ) : userDecks.length === 0 ? (
                  <>You don't have any decks yet. Create a deck first.</>
                ) : (
                  <>No decks found matching "{searchTerm}"</>
                )}
              </EmptyState>
            ) : (
              <ItemList>
                {getFilteredItems().map((item) => (
                  <ItemOption
                    key={item.id}
                    selected={formData.selectedItemId === item.id}
                    onClick={() =>
                      setFormData({ ...formData, selectedItemId: item.id })
                    }
                  >
                    <ItemIcon>
                      {targetType === "set" ? (
                        <BookOpen size={18} />
                      ) : (
                        <ListChecks size={18} />
                      )}
                    </ItemIcon>
                    <ItemInfo>
                      <ItemName>
                        {targetType === "set"
                          ? (item as CardSet).set_name
                          : (item as Deck).name}
                      </ItemName>
                      <ItemMeta>
                        {targetType === "set"
                          ? `${(item as CardSet).set_code} • ${
                              (item as CardSet).num_of_cards
                            } cards`
                          : `${getCardCount(item as Deck)} cards`}
                      </ItemMeta>
                    </ItemInfo>
                  </ItemOption>
                ))}
              </ItemList>
            )}
          </>
        )}

        {step === 3 && (
          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label>Target Name</Label>
              <TextField
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder={`${
                  targetType === "set"
                    ? cardSets.find((s) => s.id === formData.selectedItemId)
                        ?.set_name
                    : userDecks.find((d) => d.id === formData.selectedItemId)
                        ?.name
                } (default)`}
              />
            </FormGroup>

            <FormGroup>
              <Label>Description</Label>
              <TextArea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Add a description for your collection target..."
                rows={3}
              />
            </FormGroup>

            <FormGroup>
              <Label>Target Type</Label>
              <Select
                name="targetType"
                value={formData.targetType}
                onChange={handleInputChange}
              >
                <option value="one_of_each">One of each card</option>
                <option value="playset">Three of each card (playset)</option>
                <option value="rare_only">Only rare cards</option>
                <option value="custom">Custom selection</option>
              </Select>
            </FormGroup>

            <InfoText>
              <BarChart2 size={16} />
              <span>
                {formData.targetType === "one_of_each" &&
                  "You'll be tracking one copy of each card in this set/deck."}
                {formData.targetType === "playset" &&
                  "You'll be tracking three copies of each card in this set/deck."}
                {formData.targetType === "rare_only" &&
                  "You'll only track rare, super rare, ultra rare, and secret rare cards."}
                {formData.targetType === "custom" &&
                  "You can select specific cards to track after creating this target."}
              </span>
            </InfoText>
          </Form>
        )}
      </DialogContent>

      <DialogFooter>
        {step > 1 && (
          <Button variant="secondary" size="md" onClick={prevStep}>
            Back
          </Button>
        )}

        {step < 3 ? (
          <Button
            variant="primary"
            size="md"
            onClick={nextStep}
            disabled={(step === 2 && !formData.selectedItemId) || isLoading}
          >
            Next
          </Button>
        ) : (
          <Button variant="primary" size="md" onClick={handleSubmit}>
            Create Target
          </Button>
        )}
      </DialogFooter>
    </Modal>
  );
};

const DialogHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.border.light};
`;

const DialogTitle = styled.h3`
  margin: 0;
  font-size: ${theme.typography.size.xl};
  color: ${theme.colors.text.primary};
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${theme.colors.text.secondary};
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover {
    background: ${theme.colors.background.hover};
    color: ${theme.colors.text.primary};
  }
`;

const DialogContent = styled.div`
  padding: ${theme.spacing.lg} 0;
  min-height: 300px;
`;

const DialogFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.md};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border.light};
`;

const TypeSelectionText = styled.p`
  text-align: center;
  margin-bottom: ${theme.spacing.lg};
  font-size: ${theme.typography.size.lg};
  color: ${theme.colors.text.primary};
`;

const TargetTypeContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.spacing.md};
`;

const TargetTypeOption = styled.div<{ selected: boolean }>`
  padding: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.md};
  border: 2px solid
    ${(props) =>
      props.selected ? theme.colors.primary.main : theme.colors.border.light};
  background: ${(props) =>
    props.selected
      ? `${theme.colors.primary.main}10`
      : theme.colors.background.paper};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${theme.colors.primary.main};
    background: ${(props) =>
      props.selected
        ? `${theme.colors.primary.main}15`
        : `${theme.colors.primary.main}05`};
  }
`;

const TargetTypeIcon = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: ${theme.colors.background.default};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${theme.spacing.md};
  color: ${theme.colors.primary.main};
`;

const TargetTypeName = styled.div`
  font-weight: ${theme.typography.weight.semibold};
  font-size: ${theme.typography.size.lg};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing.xs};
`;

const TargetTypeDescription = styled.div`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.secondary};
`;

const SearchContainer = styled.div`
  position: relative;
  margin-bottom: ${theme.spacing.md};
`;

const SearchIcon = styled.div`
  position: absolute;
  left: ${theme.spacing.sm};
  top: 50%;
  transform: translateY(-50%);
  color: ${theme.colors.text.secondary};
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${theme.spacing.sm} ${theme.spacing.sm} ${theme.spacing.sm}
    ${theme.spacing.xl};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border.main};
  background: ${theme.colors.background.paper};
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.md};

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary.main};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoadingText = styled.div`
  color: ${theme.colors.text.secondary};
  margin-top: ${theme.spacing.md};
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: ${theme.colors.text.secondary};
  text-align: center;
  padding: ${theme.spacing.lg};
`;

const ItemList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  max-height: 300px;
  overflow-y: auto;
`;

const ItemOption = styled.div<{ selected: boolean }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid
    ${(props) =>
      props.selected ? theme.colors.primary.main : theme.colors.border.light};
  background: ${(props) =>
    props.selected
      ? `${theme.colors.primary.main}10`
      : theme.colors.background.paper};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${theme.colors.primary.main};
    background: ${(props) =>
      props.selected
        ? `${theme.colors.primary.main}15`
        : `${theme.colors.primary.main}05`};
  }
`;

const ItemIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.background.default};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.primary.main};
  flex-shrink: 0;
`;

const ItemInfo = styled.div`
  flex: 1;
`;

const ItemName = styled.div`
  font-weight: ${theme.typography.weight.medium};
  color: ${theme.colors.text.primary};
  margin-bottom: 2px;
`;

const ItemMeta = styled.div`
  font-size: ${theme.typography.size.xs};
  color: ${theme.colors.text.secondary};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const Label = styled.label`
  font-weight: ${theme.typography.weight.medium};
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.sm};
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border.main};
  background: ${theme.colors.background.paper};
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.md};
  resize: vertical;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary.main};
  }
`;

const Select = styled.select`
  width: 100%;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border.main};
  background: ${theme.colors.background.paper};
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.md};

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary.main};
  }
`;

const InfoText = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.info.subtle};
  color: ${theme.colors.info.main};
  font-size: ${theme.typography.size.sm};
`;

export default CreateTargetDialog;
