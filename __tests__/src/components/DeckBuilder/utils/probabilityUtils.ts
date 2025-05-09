import { Logger } from "../../../utils/logger";

// Create a new logger instance for probability calculations
const logger = Logger.createLogger("ProbabilityUtils");

// Set this to false to disable verbose logging
const ENABLE_DEBUG_LOGGING = false;

// Helper function to conditionally log
const debugLog = (message: string, ...args: any[]) => {
  if (ENABLE_DEBUG_LOGGING) {
    logger.debug(message, ...args);
  }
};

// Helper function for info logging
const infoLog = (message: string, ...args: any[]) => {
  if (ENABLE_DEBUG_LOGGING) {
    logger.info(message, ...args);
  }
};

/**
 * Calculate binomial coefficient (n choose k) more accurately
 */
function binomialCoefficient(n: number, k: number): number {
  debugLog(`binomialCoefficient called with n=${n}, k=${k}`);

  if (k < 0 || k > n) {
    debugLog(`Invalid inputs, returning 0`);
    return 0;
  }
  if (k === 0 || k === n) {
    debugLog(`Edge case, returning 1`);
    return 1;
  }
  if (k > n - k) {
    debugLog(`Optimization: switching to C(${n},${n - k})`);
    k = n - k; // Optimization: C(n,k) = C(n,n-k)
  }

  debugLog(`Calculating C(${n},${k})`);

  // Use a more numerically stable algorithm
  let result = 1;
  for (let i = 0; i < k; i++) {
    const prev = result;
    result = (result * (n - i)) / (i + 1);
    debugLog(`Step ${i + 1}: ${prev} * (${n} - ${i}) / (${i} + 1) = ${result}`);
  }

  debugLog(`Final result: ${result}`);
  return result;
}

// Export binomialCoefficient as combination for clearer naming
export function combination(n: number, k: number): number {
  return binomialCoefficient(n, k);
}

/**
 * Calculate the probability of drawing at least one copy of a card
 */
export function calculateDrawProbability(
  deckSize: number,
  copies: number,
  handSize: number
): number {
  infoLog(
    `Calculating probability for ${copies} copies in ${deckSize} cards with ${handSize} hand size`
  );

  if (copies <= 0 || handSize <= 0 || deckSize <= 0) {
    debugLog(`Invalid inputs, returning 0`);
    return 0;
  }
  if (copies > deckSize) {
    debugLog(`Copies > deckSize, returning 100%`);
    return 100;
  }
  if (handSize > deckSize) {
    debugLog(`Adjusting handSize from ${handSize} to ${deckSize}`);
    handSize = deckSize;
  }

  debugLog(
    `Formula: 1 - C(${deckSize}-${copies}, ${handSize}) / C(${deckSize}, ${handSize})`
  );

  // Calculate using correct hypergeometric formula
  const successNumerator = binomialCoefficient(deckSize - copies, handSize);
  const denominator = binomialCoefficient(deckSize, handSize);

  debugLog(`Numerator (ways to NOT draw the card): ${successNumerator}`);
  debugLog(`Denominator (total possible hands): ${denominator}`);

  const notDrawingProbability = successNumerator / denominator;
  debugLog(`Probability of NOT drawing: ${notDrawingProbability}`);

  const probability = Math.round((1 - notDrawingProbability) * 10000) / 100;

  // Expected values for common scenarios
  if (ENABLE_DEBUG_LOGGING && deckSize === 40 && handSize === 5) {
    let expected = 0;
    if (copies === 3) expected = 33.76;
    else if (copies === 2) expected = 23.71;
    else if (copies === 1) expected = 12.5;

    if (expected > 0) {
      infoLog(
        `Expected value for ${copies} copies in 40-card deck: ~${expected}%`
      );
      infoLog(
        `Calculated value: ${probability}% (difference: ${(
          probability - expected
        ).toFixed(2)}%)`
      );
    }
  }

  infoLog(`Final probability: ${probability}%`);
  return probability;
}

/**
 * Calculate the probability of drawing at least X copies of a card
 */
export function calculateDrawAtLeastXCopies(
  deckSize: number,
  copies: number,
  handSize: number,
  minCopies: number
): number {
  if (minCopies > copies || deckSize < handSize) return 0;
  if (minCopies <= 0) return 100;

  let probability = 0;

  // Calculate probability for drawing exactly k copies where k >= minCopies
  for (let k = minCopies; k <= Math.min(copies, handSize); k++) {
    const successCombinations = binomialCoefficient(copies, k);
    const failureCombinations = binomialCoefficient(
      deckSize - copies,
      handSize - k
    );
    const totalCombinations = binomialCoefficient(deckSize, handSize);

    if (totalCombinations === 0) continue;

    probability +=
      (successCombinations * failureCombinations) / totalCombinations;
  }

  return Math.round(probability * 10000) / 100;
}

/**
 * Calculate the probability of opening with specific combinations of cards
 */
export function calculateComboHandProbability(
  deckSize: number,
  handSize: number,
  cardGroups: { name: string; copies: number }[][]
): number {
  // Calculate individual probabilities first
  const individualProbs = cardGroups.map((group) => {
    const totalCopies = group.reduce((sum, card) => sum + card.copies, 0);
    return calculateDrawProbability(deckSize, totalCopies, handSize);
  });

  // Multiply probabilities and normalize
  return individualProbs.reduce((acc, prob) => acc * (prob / 100), 1) * 100;
}

/**
 * Interface for card efficiency metrics
 */
export interface CardEfficiencyMetrics {
  overallScore: number;
  consistency: number;
  versatility: number;
  economy: number;
}

/**
 * Estimate card efficiency based on various factors
 */
export function estimateCardEfficiency(
  card: { name: string; copies: number; openingProbability: number },
  deckSize: number
): CardEfficiencyMetrics {
  const openingHandSize = 5;

  // Calculate actual probabilities using hypergeometric distribution
  const consistency = calculateDrawProbability(
    deckSize,
    card.copies,
    openingHandSize
  );

  // Versatility scales with copies (100% for 3 copies)
  const versatility = Math.min(100, (card.copies / 3) * 100);

  // Economy is the percentage of deck space used
  const economy = Math.min(100, (card.copies / deckSize) * 100);

  // Overall score weighted average
  const overallScore =
    (consistency * 0.5 + versatility * 0.3 + economy * 0.2) / 10;

  return { overallScore, consistency, versatility, economy };
}

/**
 * Calculate the probability of drawing at least one card with a specific role
 */
export const calculateRoleProbability = (
  analytics: any,
  role: string
): number => {
  // Filter for cards that have the specified role in their roles array
  const roleCards = (analytics.mainDeck || []).filter((card: any) =>
    card.roleInfo?.roles?.includes(role)
  );

  const totalCopies = roleCards.reduce(
    (sum: number, card: any) => sum + (card.copies || 0),
    0
  );

  if (totalCopies === 0) return 0;

  return calculateDrawProbability(
    analytics.deckSize || 40,
    totalCopies,
    5 // Standard opening hand size
  );
};
