import React from "react";
import { DeckAnalyticsType } from "../types";
import OptimalDistribution from "./OptimalDistribution";
import ProbabilityFormula from "./ProbabilityFormula";
import HandCategories from "./HandCategories";

interface ProbabilityContentProps {
  processedAnalytics: DeckAnalyticsType;
  calculateOptimalDistribution: (
    totalCards: number,
    targetCards: number,
    desiredProbability?: number
  ) => Array<{ copies: number; probability: number; isOptimal: boolean }>;
  getProbabilityColor: (probability: number) => string;
  calculateFrequencyText: (probability: number, totalCopies: number) => string;
  calculateRoleProbability: any; // Using 'any' for brevity, should be properly typed
}

const ProbabilityContent: React.FC<ProbabilityContentProps> = ({
  processedAnalytics,
  calculateOptimalDistribution,
  getProbabilityColor,
  calculateFrequencyText,
  calculateRoleProbability,
}) => {
  const groupedCards = processedAnalytics?.mainDeck;
  const deckSize = processedAnalytics?.deckSize || 40;

  const normalSummonDist = calculateOptimalDistribution(deckSize, 7);
  const starterDist = calculateOptimalDistribution(deckSize, 13);

  // Count normal summons and starters
  const normalSummons = Object.values(groupedCards || [])
    .filter((card: any) => card.roleInfo?.roles?.includes("NormalSummon"))
    .reduce((sum, card: any) => sum + (card.copies || 0), 0);

  const starters = Object.values(groupedCards || [])
    .filter((card: any) => card.roleInfo?.roles?.includes("Starter"))
    .reduce((sum, card: any) => sum + (card.copies || 0), 0);

  const monsterCount = processedAnalytics.monsterCount;
  const deckPercentage = Math.round((monsterCount / deckSize) * 100);

  // Determine if there are high ratios that require warnings
  const hasHighRatios =
    normalSummons > Math.round((9 / 40) * deckSize) ||
    starters > Math.round((16 / 40) * deckSize);

  return (
    <div
      className="full-probability-analysis"
      id="probability-analysis-section"
    >
      <section className="analysis-section">
        <h3>Probability Formula</h3>
        <ProbabilityFormula />
      </section>

      <section className="analysis-section">
        <h3>Optimal Card Distribution Analysis</h3>
        <div className="distribution-graphs">
          <OptimalDistribution
            title="Normal Summon Density"
            points={normalSummonDist}
            current={normalSummons}
            optimal={Math.round((7 / 40) * deckSize)}
            targetPercentage={85}
          />
          <OptimalDistribution
            title="Starter Card Density"
            points={starterDist}
            current={starters}
            optimal={Math.round((13 / 40) * deckSize)}
            targetPercentage={90}
          />
        </div>

        <div className="distribution-explanation">
          <h4>Insights:</h4>
          <ul>
            {/* Normal Summon Insight */}
            <li>
              <span className="key-insight">
                The optimal number of Normal Summons
              </span>{" "}
              ({Math.round((7 / 40) * deckSize)}) provides ~
              {normalSummonDist.find(
                (p) => p.copies === Math.round((7 / 40) * deckSize)
              )?.probability
                ? (
                    normalSummonDist.find(
                      (p) => p.copies === Math.round((7 / 40) * deckSize)
                    )!.probability * 100
                  ).toFixed(2)
                : "61.84"}
              % chance to open with at least one in a {deckSize}-card deck,
              while minimizing brick hands.
            </li>

            {/* Starter Cards Insight */}
            <li>
              <span className="key-insight">For consistent combo decks</span>,
              aim for {Math.round((13 / 40) * deckSize)}-
              {Math.round((14 / 40) * deckSize)} starters to achieve ~
              {starterDist.find(
                (p) => p.copies === Math.round((13 / 40) * deckSize)
              )?.probability
                ? (
                    starterDist.find(
                      (p) => p.copies === Math.round((13 / 40) * deckSize)
                    )!.probability * 100
                  ).toFixed(2)
                : "88.45"}
              % chance of opening with at least one starter card.
            </li>

            {/* Current deck stats */}
            <li>
              <span className="key-insight">
                Your {deckSize}-card deck currently has
              </span>{" "}
              <span>
                {monsterCount} monsters ({deckPercentage}%),{" "}
              </span>
              <span>
                {normalSummons}{" "}
                <span
                  style={{
                    color:
                      normalSummons > Math.round((9 / 40) * deckSize)
                        ? "#FF9800"
                        : "inherit",
                    fontWeight:
                      normalSummons > Math.round((9 / 40) * deckSize)
                        ? "bold"
                        : "normal",
                  }}
                >
                  {normalSummons > Math.round((9 / 40) * deckSize)
                    ? "(high) "
                    : ""}
                </span>
                normal summons, and{" "}
              </span>
              <span>
                {starters}{" "}
                <span
                  style={{
                    color:
                      starters > Math.round((16 / 40) * deckSize)
                        ? "#FF9800"
                        : "inherit",
                    fontWeight:
                      starters > Math.round((16 / 40) * deckSize)
                        ? "bold"
                        : "normal",
                  }}
                >
                  {starters > Math.round((16 / 40) * deckSize) ? "(high) " : ""}
                </span>
                starter cards.
              </span>
            </li>

            {/* Warning for high ratios */}
            {hasHighRatios && (
              <li>
                <span className="warning-text">Warning:</span> The high density
                values shown in
                <span style={{ color: "#FF9800" }}> orange</span> indicate you
                may be overconsistent, which can lead to drawing duplicate cards
                that cannot be properly utilized (especially with normal summons
                or without discard mechanics).
              </li>
            )}
          </ul>
        </div>
      </section>

      <section className="analysis-section">
        <h3>Opening Hand Categories</h3>
        <HandCategories
          groupedCards={groupedCards}
          analytics={processedAnalytics}
          getProbabilityColor={getProbabilityColor}
          calculateFrequencyText={calculateFrequencyText}
          calculateRoleProbability={calculateRoleProbability}
        />
      </section>
    </div>
  );
};

export default ProbabilityContent;
