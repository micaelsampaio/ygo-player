import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Button,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  IconButton,
  Tooltip,
  Paper,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import InfoIcon from "@mui/icons-material/Info";
import { AnalyzerApi } from "../network/analyzerApi";
import { YgoCard } from "../types/cards";
import { getCardImageUrl } from "../../../../utils/cardImages";

interface CardReplacementSuggesterProps {
  deck: {
    name: string;
    mainDeck: YgoCard[];
    extraDeck?: YgoCard[];
    sideDeck?: YgoCard[];
  };
  analysisData: any;
}

interface ReplacementSuggestion {
  cardToReplace: YgoCard;
  suggestions: YgoCard[];
  reason: string;
}

const CardReplacementSuggester: React.FC<CardReplacementSuggesterProps> = ({
  deck,
  analysisData,
}) => {
  const [replacementSuggestions, setReplacementSuggestions] = useState<
    ReplacementSuggestion[]
  >([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("relevance");

  useEffect(() => {
    if (deck && analysisData) {
      fetchReplacementSuggestions();
    }
  }, [deck, analysisData]);

  const fetchReplacementSuggestions = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get card replacements using the analyzer API
      const replacements = await AnalyzerApi.getCardReplacements(
        deck,
        analysisData.weaknesses
      );

      setReplacementSuggestions(replacements);
    } catch (err) {
      setError("Failed to retrieve card replacement suggestions.");
      console.error("Error fetching card replacements:", err);

      // Fallback to mock data for demonstration
      generateMockReplacements();
    } finally {
      setLoading(false);
    }
  };

  // Fallback function to generate mock replacement data if API fails
  const generateMockReplacements = () => {
    // Select 3-5 cards that might benefit from replacement
    const allCards = [...deck.mainDeck, ...(deck.extraDeck || [])];
    const selectedCards = allCards
      .slice(0, Math.min(allCards.length, 20)) // Take first 20 cards at most
      .sort(() => 0.5 - Math.random()) // Shuffle
      .slice(0, 3 + Math.floor(Math.random() * 3)); // Take 3-5 random cards

    const mockSuggestions: ReplacementSuggestion[] = selectedCards.map(
      (card) => {
        // Create 2-4 mock replacement suggestions for each card
        const mockReplacements: YgoCard[] = Array.from(
          { length: 2 + Math.floor(Math.random() * 3) },
          (_, i) => ({
            id: 10000000 + Math.floor(Math.random() * 9000000),
            name: `Suggested Card ${i + 1} for ${card.name}`,
            type: card.type,
            desc: `This card would enhance your deck by addressing the ${
              analysisData.weaknesses[
                Math.floor(Math.random() * analysisData.weaknesses.length)
              ]
            } weakness.`,
            race: card.race,
            attribute: card.attribute,
            atk: card.atk,
            def: card.def,
            level: card.level,
          })
        );

        return {
          cardToReplace: card,
          suggestions: mockReplacements,
          reason: `${card.name} could be replaced to improve ${
            analysisData.weaknesses[
              Math.floor(Math.random() * analysisData.weaknesses.length)
            ]
          }.`,
        };
      }
    );

    setReplacementSuggestions(mockSuggestions);
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(event.target.value);
  };

  const handleSortChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSortBy(event.target.value as string);
  };

  // Filter suggestions based on user input
  const filteredSuggestions = replacementSuggestions.filter((suggestion) => {
    if (!filter) return true;

    const filterLower = filter.toLowerCase();

    return (
      suggestion.cardToReplace.name.toLowerCase().includes(filterLower) ||
      suggestion.reason.toLowerCase().includes(filterLower) ||
      suggestion.suggestions.some((card) =>
        card.name.toLowerCase().includes(filterLower)
      )
    );
  });

  // Sort suggestions based on user selection
  const sortedSuggestions = [...filteredSuggestions].sort((a, b) => {
    switch (sortBy) {
      case "card-name":
        return a.cardToReplace.name.localeCompare(b.cardToReplace.name);
      case "atk":
        return (b.cardToReplace.atk || 0) - (a.cardToReplace.atk || 0);
      case "def":
        return (b.cardToReplace.def || 0) - (a.cardToReplace.def || 0);
      case "level":
        return (b.cardToReplace.level || 0) - (a.cardToReplace.level || 0);
      case "suggestions-count":
        return b.suggestions.length - a.suggestions.length;
      default: // relevance - default sorting
        return 0;
    }
  });

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && replacementSuggestions.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="error" variant="h6">
          {error}
        </Typography>
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={fetchReplacementSuggestions}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              label="Filter Cards"
              value={filter}
              onChange={handleFilterChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                onChange={handleSortChange}
                label="Sort By"
              >
                <MenuItem value="relevance">Relevance</MenuItem>
                <MenuItem value="card-name">Card Name</MenuItem>
                <MenuItem value="suggestions-count">
                  Number of Suggestions
                </MenuItem>
                <MenuItem value="atk">ATK</MenuItem>
                <MenuItem value="def">DEF</MenuItem>
                <MenuItem value="level">Level/Rank</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Box sx={{ mb: 3 }}>
          <Typography color="warning.main" variant="body2">
            {error} Showing simulated recommendations for demonstration.
          </Typography>
        </Box>
      )}

      {sortedSuggestions.length === 0 ? (
        <Box sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="h6">
            No replacement suggestions available.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Your deck seems well optimized! If you'd like suggestions anyway,
            try updating your deck or refreshing the analysis.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {sortedSuggestions.map((suggestion, index) => (
            <Grid item xs={12} key={index}>
              <Card variant="outlined">
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "100%",
                          p: 2,
                          bgcolor: "rgba(0, 0, 0, 0.03)",
                          borderRadius: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 1 }}
                        >
                          Consider Replacing:
                        </Typography>

                        <Avatar
                          src={getCardImageUrl(
                            suggestion.cardToReplace.id,
                            "large"
                          )}
                          variant="rounded"
                          sx={{ width: 100, height: 146, mb: 1 }}
                        />

                        <Typography
                          variant="subtitle1"
                          sx={{ textAlign: "center", fontWeight: "bold" }}
                        >
                          {suggestion.cardToReplace.name}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ textAlign: "center", mt: 1 }}
                        >
                          {suggestion.cardToReplace.type} •{" "}
                          {suggestion.cardToReplace.attribute}
                        </Typography>

                        {suggestion.cardToReplace.atk !== undefined &&
                          suggestion.cardToReplace.def !== undefined && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ textAlign: "center" }}
                            >
                              ATK: {suggestion.cardToReplace.atk} / DEF:{" "}
                              {suggestion.cardToReplace.def}
                            </Typography>
                          )}
                      </Box>
                    </Grid>

                    <Grid item xs={12} md={9}>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          Replacement Suggestions
                        </Typography>
                        <Typography
                          variant="body2"
                          paragraph
                          color="text.secondary"
                        >
                          {suggestion.reason}
                        </Typography>

                        <List>
                          {suggestion.suggestions.map((card, cardIndex) => (
                            <React.Fragment key={cardIndex}>
                              {cardIndex > 0 && <Divider component="li" />}
                              <ListItem
                                alignItems="flex-start"
                                secondaryAction={
                                  <Box>
                                    <Tooltip title="Add to deck">
                                      <IconButton edge="end" aria-label="add">
                                        <AddCircleIcon color="success" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Card details">
                                      <IconButton edge="end" aria-label="info">
                                        <InfoIcon />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                }
                              >
                                <ListItemAvatar>
                                  <Avatar
                                    variant="rounded"
                                    src={getCardImageUrl(card.id, "small")}
                                  />
                                </ListItemAvatar>
                                <ListItemText
                                  primary={card.name}
                                  secondary={
                                    <React.Fragment>
                                      <Typography
                                        component="span"
                                        variant="body2"
                                        color="text.primary"
                                      >
                                        {card.type}{" "}
                                        {card.attribute
                                          ? `• ${card.attribute}`
                                          : ""}
                                        {card.level
                                          ? ` • Level ${card.level}`
                                          : ""}
                                      </Typography>
                                      {" — "}
                                      {card.desc.length > 120
                                        ? card.desc.substring(0, 120) + "..."
                                        : card.desc}
                                    </React.Fragment>
                                  }
                                />
                              </ListItem>
                            </React.Fragment>
                          ))}
                        </List>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default CardReplacementSuggester;
