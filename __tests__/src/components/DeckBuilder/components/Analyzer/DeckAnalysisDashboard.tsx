import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
  CircularProgress,
  Button,
  Tabs,
  Tab,
  Paper,
  Chip,
  Divider,
  Avatar,
} from "@mui/material";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { AnalyzerApi } from "../network/analyzerApi";
import CardReplacementSuggester from "./CardReplacementSuggester";
import { DeckEvolutionAdvisor } from "./DeckEvolutionAdvisor";
import { MetaAnalysisChart } from "./MetaAnalysisChart";
import { YgoCard } from "../types/cards";
import { getCardImageUrl } from "../../../../utils/cardImages";

interface DeckAnalysisData {
  deckName: string;
  archetype: string;
  strategy: string;
  mainCombos: string[];
  keyCards: YgoCard[];
  strengths: string[];
  weaknesses: string[];
  counters: string[];
  recommendedTechs: string[];
  confidenceScore: number;
  communityInsights?: string[];
  mlEnhanced?: boolean;
}

interface DeckAnalysisDashboardProps {
  deck: {
    name: string;
    mainDeck: YgoCard[];
    extraDeck?: YgoCard[];
    sideDeck?: YgoCard[];
  };
}

const DeckAnalysisDashboard: React.FC<DeckAnalysisDashboardProps> = ({
  deck,
}) => {
  const [analysisData, setAnalysisData] = useState<DeckAnalysisData | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);

  // Radar chart data for deck strengths
  const [radarData, setRadarData] = useState<any[]>([]);

  useEffect(() => {
    if (deck) {
      analyzeDeck(deck);
    }
  }, [deck]);

  // Process analysis data to create radar chart data
  useEffect(() => {
    if (analysisData) {
      // Create radar data for strategic dimensions
      const radar = [
        {
          subject: "Combo Potential",
          A: calculateDimensionScore("combo"),
          fullMark: 100,
        },
        {
          subject: "Control",
          A: calculateDimensionScore("control"),
          fullMark: 100,
        },
        {
          subject: "Aggression",
          A: calculateDimensionScore("aggro"),
          fullMark: 100,
        },
        {
          subject: "Defense",
          A: calculateDimensionScore("stall"),
          fullMark: 100,
        },
        {
          subject: "Consistency",
          A: calculateConsistencyScore(),
          fullMark: 100,
        },
        { subject: "Recovery", A: calculateRecoveryScore(), fullMark: 100 },
      ];
      setRadarData(radar);
    }
  }, [analysisData]);

  const analyzeDeck = async (deckData: any) => {
    setLoading(true);
    setError(null);

    try {
      const result = await AnalyzerApi.analyzeDeck(deckData);
      setAnalysisData(result);
    } catch (err) {
      setError("Failed to analyze deck. Please try again later.");
      console.error("Analysis error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Calculate scores for radar chart dimensions based on analyzed data
  const calculateDimensionScore = (dimensionType: string): number => {
    if (!analysisData) return 0;

    // Base score from the strategy type
    let score = analysisData.strategy.toLowerCase() === dimensionType ? 80 : 40;

    // Adjust based on strengths and weaknesses
    analysisData.strengths.forEach((strength) => {
      if (strength.toLowerCase().includes(dimensionType)) {
        score += 10;
      }
    });

    analysisData.weaknesses.forEach((weakness) => {
      if (weakness.toLowerCase().includes(dimensionType)) {
        score -= 10;
      }
    });

    // Check key cards for relevant text
    analysisData.keyCards.forEach((card) => {
      if (card.desc?.toLowerCase().includes(dimensionType)) {
        score += 5;
      }
    });

    // Ensure score stays within bounds
    return Math.max(10, Math.min(score, 100));
  };

  const calculateConsistencyScore = (): number => {
    if (!analysisData) return 0;

    // Base score
    let score = 50;

    // Adjust based on deck archetype consistency and combo potential
    if (
      analysisData.archetype !== "Unknown Archetype" &&
      analysisData.archetype !== "Mixed Strategy"
    ) {
      score += 20;
    }

    // Check for search/draw card mentions in strengths
    analysisData.strengths.forEach((strength) => {
      if (
        strength.toLowerCase().includes("search") ||
        strength.toLowerCase().includes("draw")
      ) {
        score += 10;
      }
    });

    // Check for bricking mentions in weaknesses
    analysisData.weaknesses.forEach((weakness) => {
      if (weakness.toLowerCase().includes("brick")) {
        score -= 15;
      }
    });

    return Math.max(10, Math.min(score, 100));
  };

  const calculateRecoveryScore = (): number => {
    if (!analysisData) return 0;

    // Base score
    let score = 50;

    // Check for recovery mentions in strengths
    analysisData.strengths.forEach((strength) => {
      if (
        strength.toLowerCase().includes("recovery") ||
        strength.toLowerCase().includes("graveyard")
      ) {
        score += 15;
      }
    });

    // Check for resource mentions in weaknesses
    analysisData.weaknesses.forEach((weakness) => {
      if (
        weakness.toLowerCase().includes("resource") ||
        weakness.toLowerCase().includes("limited recovery")
      ) {
        score -= 15;
      }
    });

    // Check key cards for graveyard effects
    analysisData.keyCards.forEach((card) => {
      if (card.desc?.toLowerCase().includes("graveyard")) {
        score += 10;
      }
    });

    return Math.max(10, Math.min(score, 100));
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="error" variant="h6">
          {error}
        </Typography>
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={() => analyzeDeck(deck)}
        >
          Retry Analysis
        </Button>
      </Box>
    );
  }

  if (!analysisData) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body1">
          No deck analysis data available.
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h4" component="h1" gutterBottom>
                {analysisData.deckName}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Typography variant="h6" color="primary" sx={{ mr: 1 }}>
                  {analysisData.archetype}
                </Typography>
                <Chip
                  label={analysisData.strategy}
                  color="secondary"
                  size="small"
                  sx={{ mr: 1 }}
                />
                {analysisData.mlEnhanced && (
                  <Chip
                    label="ML Enhanced"
                    color="info"
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                Confidence: {(analysisData.confidenceScore * 100).toFixed(0)}%
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart outerRadius={80} data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar
                    name="Deck Profile"
                    dataKey="A"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Overview" />
          <Tab label="Card Recommendations" />
          <Tab label="Meta Analysis" />
          <Tab label="Deck Evolution" />
          <Tab label="Community Insights" />
        </Tabs>
      </Paper>

      {/* Overview Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Key Cards
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {analysisData.keyCards.map((card, index) => (
                    <Chip
                      key={index}
                      label={card.name}
                      avatar={
                        <Avatar src={getCardImageUrl(card.id, "small")} />
                      }
                      sx={{ mb: 1 }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Main Combos
                </Typography>
                <Box>
                  {analysisData.mainCombos.length > 0 ? (
                    analysisData.mainCombos.map((combo, index) => (
                      <Typography key={index} variant="body2" paragraph>
                        • {combo}
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="body2">
                      No specific combos identified.
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom color="success.main">
                  Strengths
                </Typography>
                <Box>
                  {analysisData.strengths.map((strength, index) => (
                    <Typography key={index} variant="body2" paragraph>
                      • {strength}
                    </Typography>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom color="error.main">
                  Weaknesses
                </Typography>
                <Box>
                  {analysisData.weaknesses.map((weakness, index) => (
                    <Typography key={index} variant="body2" paragraph>
                      • {weakness}
                    </Typography>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Counter Strategies
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {analysisData.counters.map((counter, index) => (
                    <Chip
                      key={index}
                      label={counter}
                      variant="outlined"
                      color="warning"
                      sx={{ mb: 1 }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Card Recommendations Tab */}
      {activeTab === 1 && (
        <CardReplacementSuggester deck={deck} analysisData={analysisData} />
      )}

      {/* Meta Analysis Tab */}
      {activeTab === 2 && (
        <MetaAnalysisChart
          deckArchetype={analysisData.archetype}
          deckStrategy={analysisData.strategy}
        />
      )}

      {/* Deck Evolution Tab */}
      {activeTab === 3 && (
        <DeckEvolutionAdvisor
          deck={deck}
          currentArchetype={analysisData.archetype}
        />
      )}

      {/* Community Insights Tab */}
      {activeTab === 4 && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Community Insights
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {analysisData.communityInsights &&
            analysisData.communityInsights.length > 0 ? (
              analysisData.communityInsights.map((insight, index) => (
                <Box
                  key={index}
                  sx={{
                    mb: 2,
                    p: 2,
                    bgcolor: "rgba(0, 0, 0, 0.03)",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2">{insight}</Typography>
                </Box>
              ))
            ) : (
              <Typography variant="body2">
                No community insights available for this deck.
              </Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default DeckAnalysisDashboard;
