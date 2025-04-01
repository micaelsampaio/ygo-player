import { Card, CardRole } from "../types";

// Common patterns for each role
const PATTERNS = {
  STARTER: [
    "search your deck",
    "add .* from your deck to your hand",
    "special summon from your deck",
    "when this card is normal summoned",
  ],

  EXTENDER: [
    "special summon this card",
    "special summon from your hand",
    "if you control a",
    "additional normal summon",
  ],

  HANDTRAP: [
    "from your hand",
    "during your opponent's",
    "\\(Quick Effect\\)",
    "negate .* activation",
  ],

  BOARD_BREAKER: [
    "destroy all",
    "return .* to the deck",
    "banish all",
    "negate all",
    "cannot activate",
  ],

  ENGINE_KEYWORDS: [
    // Add archetype-specific patterns
    "cyberse",
    "dragon link",
    "dogmatika",
    // etc...
  ],
};

export function detectCardRole(card: Card): {
  role: CardRole;
  confidence: number;
  reason: string;
} {
  const description = card.desc.toLowerCase();
  let maxScore = 0;
  let detectedRole: CardRole = "Flexible";
  let reason = "";

  // Check each pattern category
  for (const [role, patterns] of Object.entries(PATTERNS)) {
    let score = 0;
    const matchedPatterns: string[] = [];

    patterns.forEach((pattern) => {
      const regex = new RegExp(pattern, "i");
      if (regex.test(description)) {
        score += 1;
        matchedPatterns.push(pattern);
      }
    });

    if (score > maxScore) {
      maxScore = score;
      detectedRole = mapRoleString(role);
      reason = `Matched patterns: ${matchedPatterns.join(", ")}`;
    }
  }

  // Additional heuristics - using maxScore instead of undefined score
  if (card.type.includes("Tuner")) {
    maxScore += 0.5;
  }

  // Consider card level for role determination
  if (card.level && card.level <= 4 && maxScore > 0) {
    maxScore += 0.3; // Bonus for low-level monsters that matched patterns
  }

  const confidence = Math.min((maxScore / 3) * 100, 100);

  return {
    role: detectedRole,
    confidence,
    reason,
  };
}

function mapRoleString(role: string): CardRole {
  switch (role) {
    case "STARTER":
      return "Starter";
    case "EXTENDER":
      return "Extender";
    case "HANDTRAP":
      return "Handtrap";
    case "BOARD_BREAKER":
      return "BoardBreaker";
    case "ENGINE_KEYWORDS":
      return "Engine";
    default:
      return "Flexible";
  }
}

export function analyzeDeckRoles(deck: Card[]): DeckRoleAnalytics {
  const roleDistribution: Record<CardRole, number> = {
    Starter: 0,
    Extender: 0,
    Handtrap: 0,
    BoardBreaker: 0,
    Engine: 0,
    NonEngine: 0,
    Garnets: 0,
    Flexible: 0,
  };

  const suggestions = [];
  let autoDetected = 0;
  let userAssigned = 0;

  for (const card of deck) {
    if (card.roleInfo) {
      roleDistribution[card.roleInfo.role]++;
      card.roleInfo.isAutoDetected ? autoDetected++ : userAssigned++;
    } else {
      const detection = detectCardRole(card);
      if (detection.confidence > 70) {
        suggestions.push({
          cardId: card.id,
          suggestedRole: detection.role,
          confidence: detection.confidence,
          reason: detection.reason,
        });
      }
    }
  }

  return {
    roleDistribution,
    autoDetectedRoles: autoDetected,
    userAssignedRoles: userAssigned,
    suggestions,
  };
}
