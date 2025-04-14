import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Sector,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { AnalyzerApi } from "../network/analyzerApi";

interface MetaAnalysisChartProps {
  deckArchetype: string;
  deckStrategy: string;
}

interface MetaData {
  archetypes: {
    name: string;
    representation: number;
    winRate: number;
    top4Rate: number;
    matchupData: {
      opponent: string;
      winRate: number;
      matches: number;
    }[];
    popularity: {
      week: number;
      month: number;
      season: number;
    };
    trend: {
      date: string;
      popularity: number;
      winRate: number;
    }[];
  }[];
  strategies: {
    name: string;
    representation: number;
    archetypes: string[];
  }[];
  topDecks: {
    name: string;
    archetype: string;
    placement: number;
    tournament: string;
    date: string;
  }[];
}

// COLORS for charts
const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff8042",
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#a4de6c",
  "#d0ed57",
  "#83a6ed",
  "#8dd1e1",
];

export const MetaAnalysisChart: React.FC<MetaAnalysisChartProps> = ({
  deckArchetype,
  deckStrategy,
}) => {
  const [metaData, setMetaData] = useState<MetaData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<"week" | "month" | "season">(
    "month"
  );
  const [chartType, setChartType] = useState<string>("winRates");
  const [focusedArchetype, setFocusedArchetype] = useState<string | null>(null);

  useEffect(() => {
    fetchMetaData();
  }, [timeframe]);

  useEffect(() => {
    // Set focused archetype to user's deck archetype when data loads
    if (metaData && deckArchetype) {
      const exists = metaData.archetypes.some((a) => a.name === deckArchetype);
      setFocusedArchetype(exists ? deckArchetype : null);
    }
  }, [metaData, deckArchetype]);

  const fetchMetaData = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await AnalyzerApi.getMetaAnalysis(timeframe);
      setMetaData(data);
    } catch (err) {
      setError("Failed to fetch meta analysis data.");
      console.error("Error fetching meta data:", err);

      // Generate mock data for demonstration
      generateMockMetaData();
    } finally {
      setLoading(false);
    }
  };

  // Generate mock meta data if API fails
  const generateMockMetaData = () => {
    // Create top archetypes
    const topArchetypes = [
      "Spellbook",
      "Branded",
      "Dragon Link",
      "Eldlich",
      "Sky Striker",
      "Salamangreat",
      "Drytron",
      "Tri-Brigade",
      "Virtual World",
      "Swordsoul",
    ];

    // Create a mock meta data structure
    const mock: MetaData = {
      archetypes: topArchetypes.map((name, index) => {
        // Generate trend data (last 8 weeks)
        const trendData = Array.from({ length: 8 }, (_, i) => {
          const basePopularity = Math.random() * 0.15 + 0.05;
          const baseWinRate = Math.random() * 0.25 + 0.45;

          // Add some variance but with a trend
          const weekDiff = i / 7; // 0 to 1 scale for the 8 weeks
          const trend = index < 3 ? 0.1 * weekDiff : -0.05 * weekDiff; // Top 3 growing, others declining

          return {
            date: new Date(Date.now() - (7 - i) * 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
            popularity: Math.min(0.35, Math.max(0.01, basePopularity + trend)),
            winRate: Math.min(0.75, Math.max(0.4, baseWinRate + trend / 2)),
          };
        });

        // Generate matchup data
        const matchupData = topArchetypes
          .filter((opponent) => opponent !== name)
          .map((opponent) => ({
            opponent,
            winRate: Math.random() * 0.5 + 0.25, // 25% to 75%
            matches: Math.floor(Math.random() * 100) + 10, // 10 to 109 matches
          }));

        return {
          name,
          representation: Math.random() * 0.2 + 0.02, // 2% to 22%
          winRate: Math.random() * 0.25 + 0.45, // 45% to 70%
          top4Rate: Math.random() * 0.3 + 0.1, // 10% to 40%
          matchupData,
          popularity: {
            week: Math.random() * 0.2 + 0.02,
            month: Math.random() * 0.2 + 0.02,
            season: Math.random() * 0.2 + 0.02,
          },
          trend: trendData,
        };
      }),

      strategies: [
        {
          name: "Combo",
          representation: 0.35,
          archetypes: topArchetypes.slice(0, 3),
        },
        {
          name: "Control",
          representation: 0.3,
          archetypes: topArchetypes.slice(3, 6),
        },
        {
          name: "Midrange",
          representation: 0.25,
          archetypes: topArchetypes.slice(6, 9),
        },
        { name: "Aggro", representation: 0.1, archetypes: [topArchetypes[9]] },
      ],

      topDecks: Array.from({ length: 10 }, (_, i) => ({
        name: `Player ${i + 1}'s ${
          topArchetypes[Math.floor(Math.random() * topArchetypes.length)]
        }`,
        archetype:
          topArchetypes[Math.floor(Math.random() * topArchetypes.length)],
        placement: i + 1,
        tournament:
          i < 3
            ? "YCS New York"
            : i < 7
            ? "Regional Pittsburgh"
            : "Local Tournament",
        date: new Date(
          Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .split("T")[0],
      })),
    };

    setMetaData(mock);
  };

  const handleTimeframeChange = (
    event: React.ChangeEvent<{ value: unknown }>
  ) => {
    setTimeframe(event.target.value as "week" | "month" | "season");
  };

  const handleChartTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newValue: string | null
  ) => {
    if (newValue !== null) {
      setChartType(newValue);
    }
  };

  const handleArchetypeSelect = (
    event: React.ChangeEvent<{ value: unknown }>
  ) => {
    setFocusedArchetype(event.target.value as string);
  };

  // Prepare data for the top archetypes chart
  const prepareTopArchetypesData = () => {
    if (!metaData) return [];

    // Sort archetypes by desired metric for the current chart type
    const sortBy =
      chartType === "winRates"
        ? "winRate"
        : chartType === "representation"
        ? "representation"
        : "top4Rate";

    return [...metaData.archetypes]
      .sort((a, b) => b[sortBy] - a[sortBy])
      .slice(0, 10) // Top 10 archetypes
      .map((archetype) => ({
        name: archetype.name,
        value: archetype[sortBy],
        isUserDeck: archetype.name === deckArchetype,
      }));
  };

  // Prepare data for the matchup chart
  const prepareMatchupData = () => {
    if (!metaData || !focusedArchetype) return [];

    const archetype = metaData.archetypes.find(
      (a) => a.name === focusedArchetype
    );
    if (!archetype) return [];

    return archetype.matchupData
      .sort((a, b) => b.winRate - a.winRate)
      .map((matchup) => ({
        name: matchup.opponent,
        winRate: matchup.winRate,
        matches: matchup.matches,
      }));
  };

  // Prepare data for the trend chart
  const prepareTrendData = () => {
    if (!metaData || !focusedArchetype) return [];

    const archetype = metaData.archetypes.find(
      (a) => a.name === focusedArchetype
    );
    if (!archetype) return [];

    return archetype.trend;
  };

  // Prepare data for strategy representation pie chart
  const prepareStrategyData = () => {
    if (!metaData) return [];

    return metaData.strategies.map((strategy) => ({
      name: strategy.name,
      value: strategy.representation,
      isUserStrategy: strategy.name === deckStrategy,
    }));
  };

  // Render functions for different charts
  const renderTopArchetypesChart = () => {
    const data = prepareTopArchetypesData();
    const yAxisLabel =
      chartType === "winRates"
        ? "Win Rate (%)"
        : chartType === "representation"
        ? "Meta Representation (%)"
        : "Top 4 Rate (%)";

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={70}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            label={{ value: yAxisLabel, angle: -90, position: "insideLeft" }}
            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
          />
          <RechartsTooltip
            formatter={(value: number) => `${(value * 100).toFixed(2)}%`}
          />
          <Bar dataKey="value" fill="#8884d8" isAnimationActive={true}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.isUserDeck ? "#ff8042" : COLORS[index % COLORS.length]
                }
                stroke={entry.isUserDeck ? "#ff4500" : undefined}
                strokeWidth={entry.isUserDeck ? 2 : undefined}
              />
            ))}
          </Bar>
          <Legend
            formatter={() => (
              <span>
                {chartType === "winRates"
                  ? "Win Rate"
                  : chartType === "representation"
                  ? "Meta Representation"
                  : "Top 4 Rate"}
              </span>
            )}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderMatchupChart = () => {
    const data = prepareMatchupData();

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={70}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            label={{
              value: "Win Rate (%)",
              angle: -90,
              position: "insideLeft",
            }}
            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            domain={[0, 1]}
          />
          <RechartsTooltip
            formatter={(value: number, name: string) => [
              `${(value * 100).toFixed(2)}%`,
              name === "winRate" ? "Win Rate" : "Matches",
            ]}
          />
          <Bar dataKey="winRate" fill="#82ca9d" name="Win Rate">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.winRate > 0.5
                    ? "#82ca9d"
                    : entry.winRate < 0.5
                    ? "#ff8042"
                    : "#ffc658"
                }
              />
            ))}
          </Bar>
          <Legend />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderTrendChart = () => {
    const data = prepareTrendData();

    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" padding={{ left: 20, right: 20 }} />
          <YAxis
            yAxisId="left"
            label={{
              value: "Win Rate (%)",
              angle: -90,
              position: "insideLeft",
            }}
            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            domain={[0.35, 0.8]}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{
              value: "Popularity (%)",
              angle: 90,
              position: "insideRight",
            }}
            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            domain={[0, 0.4]}
          />
          <RechartsTooltip
            formatter={(value: number) => `${(value * 100).toFixed(2)}%`}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="winRate"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
            name="Win Rate"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="popularity"
            stroke="#82ca9d"
            name="Popularity"
          />
          <Legend />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderStrategyChart = () => {
    const data = prepareStrategyData();

    return (
      <ResponsiveContainer width="100%" height={400}>
        <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={true}
            outerRadius={130}
            innerRadius={65}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ name, value, percent }) =>
              `${name}: ${(percent * 100).toFixed(0)}%`
            }
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.isUserStrategy
                    ? "#ff8042"
                    : COLORS[index % COLORS.length]
                }
                stroke={entry.isUserStrategy ? "#ff4500" : undefined}
                strokeWidth={entry.isUserStrategy ? 2 : undefined}
              />
            ))}
          </Pie>
          <RechartsTooltip
            formatter={(value: number) => `${(value * 100).toFixed(2)}%`}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !metaData) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="error" variant="h6">
          {error}
        </Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={fetchMetaData}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Box sx={{ mb: 3 }}>
          <Typography color="warning.main" variant="body2">
            {error} Showing simulated meta data for demonstration.
          </Typography>
        </Box>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Timeframe</InputLabel>
              <Select
                value={timeframe}
                onChange={handleTimeframeChange}
                label="Timeframe"
              >
                <MenuItem value="week">Last Week</MenuItem>
                <MenuItem value="month">Last Month</MenuItem>
                <MenuItem value="season">Current Season</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={8}>
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <ToggleButtonGroup
                value={chartType}
                exclusive
                onChange={handleChartTypeChange}
                aria-label="chart type"
              >
                <ToggleButton value="winRates">Win Rates</ToggleButton>
                <ToggleButton value="representation">Meta Share</ToggleButton>
                <ToggleButton value="top4Rate">Top Cut %</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top {chartType === "winRates" ? "Performing" : "Represented"}{" "}
                Archetypes
              </Typography>
              {renderTopArchetypesChart()}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Strategy Distribution
              </Typography>
              {renderStrategyChart()}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6">Archetype Details</Typography>

                <FormControl variant="outlined" sx={{ minWidth: 200 }}>
                  <InputLabel>Select Archetype</InputLabel>
                  <Select
                    value={focusedArchetype || ""}
                    onChange={handleArchetypeSelect}
                    label="Select Archetype"
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {metaData?.archetypes.map((archetype, index) => (
                      <MenuItem
                        key={index}
                        value={archetype.name}
                        sx={
                          archetype.name === deckArchetype
                            ? { fontWeight: "bold", color: "primary.main" }
                            : {}
                        }
                      >
                        {archetype.name}
                        {archetype.name === deckArchetype ? " (Your Deck)" : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {focusedArchetype ? (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" align="center" gutterBottom>
                      Matchup Analysis
                    </Typography>
                    {renderMatchupChart()}
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" align="center" gutterBottom>
                      Popularity & Performance Trend
                    </Typography>
                    {renderTrendChart()}
                  </Grid>
                </Grid>
              ) : (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <Typography variant="body1">
                    Select an archetype to view detailed analysis.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Top Performing Decks
              </Typography>

              <Box sx={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "8px",
                          borderBottom: "1px solid rgba(0,0,0,0.12)",
                        }}
                      >
                        Placement
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "8px",
                          borderBottom: "1px solid rgba(0,0,0,0.12)",
                        }}
                      >
                        Deck Name
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "8px",
                          borderBottom: "1px solid rgba(0,0,0,0.12)",
                        }}
                      >
                        Archetype
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "8px",
                          borderBottom: "1px solid rgba(0,0,0,0.12)",
                        }}
                      >
                        Tournament
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "8px",
                          borderBottom: "1px solid rgba(0,0,0,0.12)",
                        }}
                      >
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metaData?.topDecks.map((deck, index) => (
                      <tr key={index}>
                        <td
                          style={{
                            padding: "8px",
                            borderBottom: "1px solid rgba(0,0,0,0.12)",
                          }}
                        >
                          {deck.placement}
                        </td>
                        <td
                          style={{
                            padding: "8px",
                            borderBottom: "1px solid rgba(0,0,0,0.12)",
                          }}
                        >
                          {deck.name}
                        </td>
                        <td
                          style={{
                            padding: "8px",
                            borderBottom: "1px solid rgba(0,0,0,0.12)",
                            fontWeight:
                              deck.archetype === deckArchetype
                                ? "bold"
                                : "normal",
                            color:
                              deck.archetype === deckArchetype
                                ? "primary.main"
                                : "inherit",
                          }}
                        >
                          {deck.archetype}
                          {deck.archetype === deckArchetype
                            ? " (Your Archetype)"
                            : ""}
                        </td>
                        <td
                          style={{
                            padding: "8px",
                            borderBottom: "1px solid rgba(0,0,0,0.12)",
                          }}
                        >
                          {deck.tournament}
                        </td>
                        <td
                          style={{
                            padding: "8px",
                            borderBottom: "1px solid rgba(0,0,0,0.12)",
                          }}
                        >
                          {deck.date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
