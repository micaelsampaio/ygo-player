import React, { useState, useEffect } from "react";
import { Card, CardRole, DeckRoleAnalytics } from "../../types";
import { analyzeDeckRoles } from "../../utils/cardRoleDetector";
import "./RoleManager.css";

interface RoleManagerProps {
  deck: Card[];
  updateCardRole: (
    cardId: number,
    role: CardRole,
    isAutoDetected: boolean
  ) => void;
}

const RoleManager: React.FC<RoleManagerProps> = ({ deck, updateCardRole }) => {
  const [analytics, setAnalytics] = useState<DeckRoleAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "suggestions">(
    "overview"
  );

  useEffect(() => {
    let mounted = true;

    const analyze = async () => {
      // Process analytics in the next tick
      await new Promise((resolve) => setTimeout(resolve, 0));
      const results = analyzeDeckRoles(deck);

      if (mounted) {
        setAnalytics(results);
      }
    };

    analyze();

    return () => {
      mounted = false;
    };
  }, [deck]);

  if (!analytics) return null;

  const roleColors: Record<CardRole, string> = {
    Starter: "#4CAF50",
    Extender: "#2196F3",
    Handtrap: "#9C27B0",
    BoardBreaker: "#F44336",
    Engine: "#FF9800",
    NonEngine: "#607D8B",
    Garnets: "#795548",
    Flexible: "#9E9E9E",
  };

  return (
    <div className="role-manager">
      <div className="role-tabs">
        <button
          className={activeTab === "overview" ? "active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={activeTab === "suggestions" ? "active" : ""}
          onClick={() => setActiveTab("suggestions")}
        >
          Suggestions ({analytics.suggestions.length})
        </button>
      </div>

      {activeTab === "overview" && (
        <div className="role-overview">
          <div className="role-distribution">
            {Object.entries(analytics.roleDistribution).map(([role, count]) => (
              <div key={role} className="role-bar">
                <div className="role-label">{role}</div>
                <div className="role-bar-container">
                  <div
                    className="role-bar-fill"
                    style={{
                      width: `${(count / deck.length) * 100}%`,
                      backgroundColor: roleColors[role as CardRole],
                    }}
                  />
                </div>
                <div className="role-count">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "suggestions" && (
        <div className="role-suggestions">
          {analytics.suggestions.map((suggestion) => (
            <div key={suggestion.cardId} className="suggestion-item">
              <div className="suggestion-header">
                <span>
                  {deck.find((c) => c.id === suggestion.cardId)?.name}
                </span>
                <span className="confidence">
                  {suggestion.confidence.toFixed(0)}%
                </span>
              </div>
              <div className="suggestion-content">
                <p>
                  Suggested role: <strong>{suggestion.suggestedRole}</strong>
                </p>
                <p className="reason">{suggestion.reason}</p>
                <div className="suggestion-actions">
                  <button
                    onClick={() =>
                      updateCardRole(
                        suggestion.cardId,
                        suggestion.suggestedRole,
                        true
                      )
                    }
                    className="accept-suggestion"
                  >
                    Accept
                  </button>
                  <button className="reject-suggestion">Ignore</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoleManager;
