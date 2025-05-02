import React, { useState, useCallback, useEffect } from "react";
import styled from "styled-components";
import { ThemeProvider } from "styled-components";
import { useNavigate, useLocation } from "react-router-dom";
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
  const [selectedMatchupName, setSelectedMatchupName] = useState<string | null>(
    null
  );

  const navigate = useNavigate();
  const location = useLocation();

  // Load saved matchups from localStorage
  useEffect(() => {
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

  // Load shared matchup from query parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const sharedData = queryParams.get("data");

    if (!sharedData) return;

    console.log("=====================================");
    console.log("SHARED MATCHUP DETECTED IN QUERY PARAMETERS");
    console.log(
      "Encoded data:",
      sharedData.length > 50 ? sharedData.substring(0, 50) + "..." : sharedData
    );
    console.log("Data length:", sharedData.length);
    console.log("=====================================");

    try {
      // Simple direct base64 decoding
      const decoded = decodeURIComponent(atob(sharedData));
      console.log("Successfully decoded base64 data, length:", decoded.length);

      // Parse JSON and validate structure
      const parsedData = JSON.parse(decoded);
      console.log("Successfully parsed JSON data");

      if (
        parsedData &&
        parsedData.cards &&
        parsedData.archetypes &&
        parsedData.ratings
      ) {
        console.log(
          "Valid matchup data found:",
          `${parsedData.cards.length} cards, ${parsedData.archetypes.length} archetypes`
        );

        // Set the data in the component state
        setMatchupData(parsedData);
        setCurrentMatchupName(
          `Shared Matchup ${new Date().toLocaleDateString()}`
        );
        alert("Shared matchup loaded successfully!");
      } else {
        throw new Error("Invalid matchup data structure");
      }
    } catch (error) {
      console.error("Error processing shared matchup:", error);
      alert("Failed to load shared matchup. The link may be corrupted.");
    }
  }, [location.search]);

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

  // Load a saved matchup with enhanced selection
  const handleLoadMatchup = useCallback((name: string) => {
    const storageKey = `matchup_${name}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setMatchupData(JSON.parse(saved));
        setCurrentMatchupName(name);
        setSelectedMatchupName(null); // Clear selection after loading
        localStorage.setItem("last_matchup_key", storageKey);
      }
    } catch (error) {
      console.error("Error loading matchup:", error);
      alert("Failed to load the matchup");
    }
  }, []);

  // Remove a saved matchup
  const handleDeleteMatchup = useCallback(
    (name: string) => {
      if (!confirm(`Are you sure you want to delete the matchup "${name}"?`)) {
        return;
      }

      const storageKey = `matchup_${name}`;
      try {
        // Remove from localStorage
        localStorage.removeItem(storageKey);

        // If this was the last selected matchup, clear that reference
        const lastMatchupKey = localStorage.getItem("last_matchup_key");
        if (lastMatchupKey === storageKey) {
          localStorage.removeItem("last_matchup_key");
        }

        // Update saved matchups list
        setSavedMatchups((prev) => prev.filter((m) => m.name !== name));

        // If the current matchup was deleted, reset to a new matchup
        if (currentMatchupName === name) {
          setMatchupData(INITIAL_MATCHUP);
          setCurrentMatchupName("New Matchup");
        }

        alert(`Matchup "${name}" has been deleted`);
      } catch (error) {
        console.error("Error deleting matchup:", error);
        alert("Failed to delete the matchup");
      }
    },
    [currentMatchupName]
  );

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

  // Import matchup from JSON file
  const handleImportMatchup = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target?.result as string);

          // Validate that the imported data has the required structure
          if (
            !importedData.cards ||
            !importedData.archetypes ||
            !importedData.ratings
          ) {
            throw new Error("Invalid matchup data format");
          }

          setMatchupData(importedData);
          setCurrentMatchupName(
            `Imported Matchup ${new Date().toLocaleDateString()}`
          );
          alert("Matchup data imported successfully!");
        } catch (error) {
          console.error("Error importing matchup:", error);
          alert("Failed to import the matchup. Invalid file format.");
        }
      };
      reader.readAsText(file);
    };

    input.click();
  }, []);

  // Share matchup as URL
  const handleShareMatchup = useCallback(() => {
    try {
      console.log("Starting share matchup process...");
      // Convert matchup data to JSON string
      const matchupJson = JSON.stringify(matchupData);
      console.log("Matchup data serialized, length:", matchupJson.length);

      // Encode with base64
      const base64 = btoa(encodeURIComponent(matchupJson));
      console.log("Encoded with base64, length:", base64.length);

      // Create the sharing URL with query parameter
      const shareUrl = `${window.location.origin}/matchup-maker?data=${base64}`;
      console.log("Generated share URL:", shareUrl.substring(0, 50) + "...");

      // Copy the URL to clipboard
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          console.log("URL copied to clipboard successfully");
          alert("Share URL copied to clipboard!");
        })
        .catch((err) => {
          console.error("Failed to copy to clipboard:", err);
          // If clipboard API fails, just show the URL
          prompt("Copy this URL to share your matchup:", shareUrl);
        });
    } catch (error) {
      console.error("Error creating share URL:", error);
      alert(
        "Failed to create share URL: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }, [matchupData]);

  // Export matchup matrix as image
  const handleExportAsImage = useCallback(() => {
    try {
      // Find the matrix element
      const matrixElement = document.getElementById("matchup-matrix");
      if (!matrixElement) {
        throw new Error("Could not find the matchup matrix element");
      }

      // Use html2canvas to capture the element (dynamically import to avoid adding dependency if not used)
      import("html2canvas")
        .then((html2canvas) => {
          html2canvas
            .default(matrixElement, {
              backgroundColor: theme.colors.background.paper,
              scale: 2, // Better resolution
              logging: false,
              allowTaint: true,
              useCORS: true,
            })
            .then((canvas) => {
              // Create file name
              const fileName = `${currentMatchupName.replace(
                /\s+/g,
                "_"
              )}_matrix_${new Date().toISOString().split("T")[0]}.png`;

              // Convert to PNG and download
              const link = document.createElement("a");
              link.download = fileName;
              link.href = canvas.toDataURL("image/png");
              link.click();
            });
        })
        .catch((err) => {
          console.error("Error loading html2canvas:", err);
          alert(
            "Failed to export as image. Make sure you're online as additional resources need to be loaded."
          );
        });
    } catch (error) {
      console.error("Error exporting matchup as image:", error);
      alert("Failed to export the matchup as an image");
    }
  }, [matchupData, currentMatchupName, theme.colors.background.paper]);

  // Function to handle matchup selection
  const handleSelectMatchup = (name: string) => {
    if (selectedMatchupName === name) {
      setSelectedMatchupName(null); // Deselect if already selected
    } else {
      setSelectedMatchupName(name); // Select the matchup
    }
  };

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
                </ButtonsGroup>
              </ControlGrid>

              <ButtonsRow>
                <Button onClick={handleImportMatchup} variant="tertiary">
                  Import
                </Button>
                {/* Only show these buttons if there are saved matchups */}
                {savedMatchups.length > 0 && (
                  <>
                    <Button onClick={handleExportMatchup} variant="tertiary">
                      Export
                    </Button>
                    <Button onClick={handleShareMatchup} variant="tertiary">
                      Share URL
                    </Button>
                    <Button onClick={handleExportAsImage} variant="tertiary">
                      Export as Image
                    </Button>
                  </>
                )}
              </ButtonsRow>
            </ControlSection>

            {savedMatchups.length > 0 && (
              <SavedMatchupsSection>
                <h2>Saved Matchups</h2>
                <p>Click on a matchup to select it and view options</p>
                <SavedMatchupsList>
                  {savedMatchups.map((matchup) => (
                    <SavedMatchupItem
                      key={matchup.name}
                      isSelected={selectedMatchupName === matchup.name}
                      onClick={() => handleSelectMatchup(matchup.name)}
                    >
                      <MatchupName>{matchup.name}</MatchupName>
                      {selectedMatchupName === matchup.name && (
                        <SavedButtonsGroup>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLoadMatchup(matchup.name);
                            }}
                            variant="tertiary"
                            size="sm"
                          >
                            Load
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMatchup(matchup.name);
                            }}
                            variant="danger"
                            size="sm"
                          >
                            Delete
                          </Button>
                        </SavedButtonsGroup>
                      )}
                    </SavedMatchupItem>
                  ))}
                </SavedMatchupsList>
              </SavedMatchupsSection>
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
                  <li>
                    Export your matchup matrix as an image for easy sharing
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

const SavedMatchupsSection = styled.section`
  background-color: ${(props) => props.theme.colors.background.card};
  border-radius: ${(props) => props.theme.borderRadius.lg};
  padding: ${(props) => props.theme.spacing.lg};
  margin-top: ${(props) => props.theme.spacing.lg};
  box-shadow: ${(props) => props.theme.shadows.sm};

  h2 {
    margin-top: 0;
    margin-bottom: ${(props) => props.theme.spacing.md};
  }

  p {
    margin-bottom: ${(props) => props.theme.spacing.md};
    color: ${(props) => props.theme.colors.text.secondary};
  }
`;

const ControlGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: ${(props) => props.theme.spacing.lg};
  align-items: flex-end; /* Align both elements at the bottom */

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
    height: 32px; /* Specify exact height to match buttons */
    padding: 6px 12px; /* Match button padding */
    border: 1px solid ${(props) => props.theme.colors.border.default};
    border-radius: ${(props) => props.theme.borderRadius.md};
    font-size: ${(props) =>
      props.theme.typography.size.sm}; /* Match button font size */
    box-sizing: border-box; /* Ensure padding is included in height */
  }
`;

const ButtonsGroup = styled.div`
  display: flex;
  gap: ${(props) => props.theme.spacing.sm};
  align-items: flex-end; /* Align buttons at the bottom */
  justify-content: flex-end; /* Align buttons to the right */

  @media (max-width: 768px) {
    justify-content: flex-start;
  }
`;

const ButtonsRow = styled.div`
  display: flex;
  gap: ${(props) => props.theme.spacing.sm};
  margin-top: ${(props) => props.theme.spacing.md};

  @media (max-width: 768px) {
    flex-wrap: wrap;
  }
`;

const SavedMatchupsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${(props) => props.theme.spacing.md};
`;

const SavedMatchupItem = styled.div<{ isSelected: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: ${(props) =>
    props.isSelected
      ? props.theme.colors.background.highlight
      : props.theme.colors.background.paper};
  border-radius: ${(props) => props.theme.borderRadius.md};
  padding: ${(props) => props.theme.spacing.sm};
  box-shadow: ${(props) => props.theme.shadows.xs};
  cursor: pointer;

  span {
    font-weight: ${(props) => props.theme.typography.weight.medium};
  }
`;

const MatchupName = styled.span`
  font-weight: ${(props) => props.theme.typography.weight.medium};
`;

const SavedButtonsGroup = styled.div`
  display: flex;
  gap: ${(props) => props.theme.spacing.sm};
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
