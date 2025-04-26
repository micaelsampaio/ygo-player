import React, { useState, useCallback } from "react";
import styled from "styled-components";
import { ThemeProvider } from "styled-components";
import theme from "../styles/theme";
import AppLayout from "../components/Layout/AppLayout";
import MatchupMatrix from "../components/MatchupMaker/MatchupMatrix";
import Button from "../components/UI/Button";
import Card from "../components/UI/Card";

// Import CDN URL for card images (if needed)
const cdnUrl = String(
  import.meta.env.VITE_YGO_CDN_URL || "https://cdn.example.com"
);

// Types for our cards and archetypes
export interface CardItem {
  id: number;
  name: string;
  type?: string;
  description?: string;
}

export interface ArchetypeItem {
  id: string;
  name: string;
  description?: string;
  representativeCardId?: number;
}

// Types for our matrix data
export interface EffectivenessRating {
  rating: "effective" | "ineffective" | "neutral" | "";
  notes?: string;
}

export interface MatchupData {
  cards: CardItem[];
  archetypes: ArchetypeItem[];
  ratings: {
    [key: string]: {
      [key: string]: EffectivenessRating;
    };
  };
}

const INITIAL_MATCHUP: MatchupData = {
  cards: [],
  archetypes: [],
  ratings: {},
};

const MatchupMakerPage: React.FC = () => {
  const [matchupData, setMatchupData] = useState<MatchupData>(INITIAL_MATCHUP);
  const [savedMatchups, setSavedMatchups] = useState<
    { name: string; data: MatchupData }[]
  >([]);
  const [currentMatchupName, setCurrentMatchupName] =
    useState<string>("New Matchup");

  // Load saved matchups from localStorage
  React.useEffect(() => {
    const loadSavedMatchups = () => {
      try {
        const keys = Object.keys(localStorage).filter((key) =>
          key.startsWith("matchup_")
        );
        const loadedMatchups = keys.map((key) => {
          const data = JSON.parse(localStorage.getItem(key) || "{}");
          return {
            name: key.replace("matchup_", ""),
            data,
          };
        });
        setSavedMatchups(loadedMatchups);

        // Load the last used matchup if it exists
        const lastMatchupKey = localStorage.getItem("last_matchup_key");
        if (lastMatchupKey) {
          const matchupData = localStorage.getItem(lastMatchupKey);
          if (matchupData) {
            setMatchupData(JSON.parse(matchupData));
            setCurrentMatchupName(lastMatchupKey.replace("matchup_", ""));
          }
        }
      } catch (error) {
        console.error("Error loading saved matchups:", error);
      }
    };

    loadSavedMatchups();
  }, []);

  // Add a card to the X-axis of the matrix
  const handleAddCard = useCallback((card: CardItem) => {
    setMatchupData((prev) => {
      // Check if card already exists
      if (prev.cards.some((c) => c.id === card.id)) {
        return prev;
      }

      // Add card and update ratings
      const newData = {
        ...prev,
        cards: [...prev.cards, card],
        ratings: { ...prev.ratings },
      };

      // Initialize ratings for the new card
      prev.archetypes.forEach((archetype) => {
        if (!newData.ratings[archetype.id]) {
          newData.ratings[archetype.id] = {};
        }
        newData.ratings[archetype.id][card.id] = { rating: "" };
      });

      return newData;
    });
  }, []);

  // Add an archetype to the Y-axis of the matrix
  const handleAddArchetype = useCallback((archetype: ArchetypeItem) => {
    setMatchupData((prev) => {
      // Check if archetype already exists
      if (prev.archetypes.some((a) => a.id === archetype.id)) {
        return prev;
      }

      // Add archetype and update ratings
      const newData = {
        ...prev,
        archetypes: [...prev.archetypes, archetype],
        ratings: { ...prev.ratings },
      };

      // Initialize ratings for the new archetype
      newData.ratings[archetype.id] = {};
      prev.cards.forEach((card) => {
        newData.ratings[archetype.id][card.id] = { rating: "" };
      });

      return newData;
    });
  }, []);

  // Update a rating in the matrix
  const handleUpdateRating = useCallback(
    (archetypeId: string, cardId: number, rating: EffectivenessRating) => {
      setMatchupData((prev) => {
        const newData = { ...prev };
        if (!newData.ratings[archetypeId]) {
          newData.ratings[archetypeId] = {};
        }
        newData.ratings[archetypeId][cardId] = rating;
        return newData;
      });
    },
    []
  );

  // Remove a card from the matrix
  const handleRemoveCard = useCallback((cardId: number) => {
    setMatchupData((prev) => {
      const newCards = prev.cards.filter((card) => card.id !== cardId);
      const newRatings = { ...prev.ratings };

      // Remove card ratings from all archetypes
      Object.keys(newRatings).forEach((archetypeId) => {
        if (newRatings[archetypeId][cardId]) {
          const { [cardId]: removed, ...rest } = newRatings[archetypeId];
          newRatings[archetypeId] = rest;
        }
      });

      return {
        ...prev,
        cards: newCards,
        ratings: newRatings,
      };
    });
  }, []);

  // Remove an archetype from the matrix
  const handleRemoveArchetype = useCallback((archetypeId: string) => {
    setMatchupData((prev) => {
      const newArchetypes = prev.archetypes.filter(
        (archetype) => archetype.id !== archetypeId
      );
      const { [archetypeId]: removed, ...newRatings } = prev.ratings;

      return {
        ...prev,
        archetypes: newArchetypes,
        ratings: newRatings,
      };
    });
  }, []);

  // Save the current matchup
  const handleSaveMatchup = useCallback(() => {
    if (!currentMatchupName.trim()) {
      alert("Please enter a name for this matchup");
      return;
    }

    const storageKey = `matchup_${currentMatchupName}`;

    try {
      localStorage.setItem(storageKey, JSON.stringify(matchupData));
      localStorage.setItem("last_matchup_key", storageKey);

      // Update saved matchups list
      setSavedMatchups((prev) => {
        const existing = prev.findIndex((m) => m.name === currentMatchupName);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { name: currentMatchupName, data: matchupData };
          return updated;
        }
        return [...prev, { name: currentMatchupName, data: matchupData }];
      });

      alert(`Matchup "${currentMatchupName}" has been saved`);
    } catch (error) {
      console.error("Error saving matchup:", error);
      alert("Failed to save the matchup");
    }
  }, [matchupData, currentMatchupName]);

  // Load a saved matchup
  const handleLoadMatchup = useCallback((name: string) => {
    const storageKey = `matchup_${name}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setMatchupData(JSON.parse(saved));
        setCurrentMatchupName(name);
        localStorage.setItem("last_matchup_key", storageKey);
      }
    } catch (error) {
      console.error("Error loading matchup:", error);
      alert("Failed to load the matchup");
    }
  }, []);

  // Create a new matchup
  const handleNewMatchup = useCallback(() => {
    if (matchupData.cards.length > 0 || matchupData.archetypes.length > 0) {
      if (!confirm("Create a new matchup? Unsaved changes will be lost.")) {
        return;
      }
    }

    setMatchupData(INITIAL_MATCHUP);
    setCurrentMatchupName("New Matchup");
  }, [matchupData]);

  // Export matchup as JSON
  const handleExportMatchup = useCallback(() => {
    try {
      const dataStr = JSON.stringify(matchupData, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
        dataStr
      )}`;

      const exportFileName = `${currentMatchupName.replace(/\s+/g, "_")}_${
        new Date().toISOString().split("T")[0]
      }.json`;

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileName);
      linkElement.click();
    } catch (error) {
      console.error("Error exporting matchup:", error);
      alert("Failed to export the matchup");
    }
  }, [matchupData, currentMatchupName]);

  return (
    <ThemeProvider theme={theme}>
      <AppLayout>
        <PageContainer>
          <Header>
            <h1>Yu-Gi-Oh! Matchup Maker</h1>
            <p>
              Create and analyze matchups between handtraps/breakers and deck
              archetypes
            </p>
          </Header>

          <ControlPanel>
            <ControlSection>
              <h2>Matchup Management</h2>
              <ControlGrid>
                <div>
                  <label htmlFor="matchup-name">Matchup Name:</label>
                  <input
                    id="matchup-name"
                    type="text"
                    value={currentMatchupName}
                    onChange={(e) => setCurrentMatchupName(e.target.value)}
                    placeholder="Enter matchup name"
                  />
                </div>

                <ButtonsGroup>
                  <Button onClick={handleSaveMatchup} variant="primary">
                    Save
                  </Button>
                  <Button onClick={handleNewMatchup} variant="secondary">
                    New
                  </Button>
                  <Button onClick={handleExportMatchup} variant="secondary">
                    Export
                  </Button>
                </ButtonsGroup>
              </ControlGrid>
            </ControlSection>

            {savedMatchups.length > 0 && (
              <ControlSection>
                <h3>Saved Matchups</h3>
                <SavedMatchupsList>
                  {savedMatchups.map((matchup) => (
                    <SavedMatchupItem key={matchup.name}>
                      <span>{matchup.name}</span>
                      <Button
                        onClick={() => handleLoadMatchup(matchup.name)}
                        variant="tertiary"
                        size="sm"
                      >
                        Load
                      </Button>
                    </SavedMatchupItem>
                  ))}
                </SavedMatchupsList>
              </ControlSection>
            )}
          </ControlPanel>

          <MatchupMatrix
            matchupData={matchupData}
            onAddCard={handleAddCard}
            onAddArchetype={handleAddArchetype}
            onUpdateRating={handleUpdateRating}
            onRemoveCard={handleRemoveCard}
            onRemoveArchetype={handleRemoveArchetype}
          />

          <HelpSection>
            <Card elevation="low">
              <Card.Content>
                <h3>How to Use the Matchup Maker</h3>
                <ol>
                  <li>
                    Add handtraps/breakers to the X-axis by clicking "Add Card"
                  </li>
                  <li>
                    Add deck archetypes to the Y-axis by clicking "Add
                    Archetype"
                  </li>
                  <li>
                    Click on a cell to mark if a card is effective (✓) or
                    ineffective (✗) against an archetype
                  </li>
                  <li>
                    Save your matchup by entering a name and clicking "Save"
                  </li>
                  <li>
                    Export your matchup as a JSON file to share with others
                  </li>
                </ol>
                <p>
                  This tool helps you visualize which handtraps and breakers are
                  effective against various deck archetypes, making it easier to
                  build sideboards and prepare for tournaments.
                </p>
              </Card.Content>
            </Card>
          </HelpSection>
        </PageContainer>
      </AppLayout>
    </ThemeProvider>
  );
};

// Styled Components
const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${(props) => props.theme.spacing.lg};
`;

const Header = styled.header`
  margin-bottom: ${(props) => props.theme.spacing.xl};
  text-align: center;

  h1 {
    font-size: ${(props) => props.theme.typography.size["3xl"]};
    color: ${(props) => props.theme.colors.text.primary};
    margin-bottom: ${(props) => props.theme.spacing.sm};
  }

  p {
    font-size: ${(props) => props.theme.typography.size.lg};
    color: ${(props) => props.theme.colors.text.secondary};
  }
`;

const ControlPanel = styled.div`
  margin-bottom: ${(props) => props.theme.spacing.xl};
`;

const ControlSection = styled.section`
  background-color: ${(props) => props.theme.colors.background.card};
  border-radius: ${(props) => props.theme.borderRadius.lg};
  padding: ${(props) => props.theme.spacing.lg};
  margin-bottom: ${(props) => props.theme.spacing.lg};
  box-shadow: ${(props) => props.theme.shadows.sm};

  h2,
  h3 {
    margin-top: 0;
    margin-bottom: ${(props) => props.theme.spacing.md};
  }
`;

const ControlGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: ${(props) => props.theme.spacing.lg};
  align-items: center;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }

  label {
    display: block;
    margin-bottom: ${(props) => props.theme.spacing.xs};
    color: ${(props) => props.theme.colors.text.secondary};
  }

  input {
    width: 100%;
    padding: ${(props) => props.theme.spacing.sm};
    border: 1px solid ${(props) => props.theme.colors.border.default};
    border-radius: ${(props) => props.theme.borderRadius.md};
    font-size: ${(props) => props.theme.typography.size.base};
  }
`;

const ButtonsGroup = styled.div`
  display: flex;
  gap: ${(props) => props.theme.spacing.sm};

  @media (max-width: 768px) {
    justify-content: flex-start;
  }
`;

const SavedMatchupsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${(props) => props.theme.spacing.md};
`;

const SavedMatchupItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: ${(props) => props.theme.colors.background.paper};
  border-radius: ${(props) => props.theme.borderRadius.md};
  padding: ${(props) => props.theme.spacing.sm};
  box-shadow: ${(props) => props.theme.shadows.xs};

  span {
    font-weight: ${(props) => props.theme.typography.weight.medium};
  }
`;

const HelpSection = styled.section`
  margin-top: ${(props) => props.theme.spacing.xl};

  h3 {
    margin-top: 0;
  }

  ol {
    padding-left: ${(props) => props.theme.spacing.lg};

    li {
      margin-bottom: ${(props) => props.theme.spacing.xs};
    }
  }
`;

export default MatchupMakerPage;
