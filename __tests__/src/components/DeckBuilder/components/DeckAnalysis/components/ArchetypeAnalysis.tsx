import React from "react";
import { DeckAnalyticsType } from "../types";

interface ArchetypeAnalysisProps {
  archetypes: DeckAnalyticsType["potentialArchetypes"];
}

const ArchetypeAnalysis: React.FC<ArchetypeAnalysisProps> = ({
  archetypes,
}) => (
  <div className="archetype-tags">
    {archetypes.length > 0 ? (
      archetypes.map((archetype, index) => (
        <div key={index} className="archetype-tag">
          {archetype.name}
          <span className="archetype-count">{archetype.count}</span>
        </div>
      ))
    ) : (
      <p>No archetype detected. This appears to be a custom strategy deck.</p>
    )}
  </div>
);

export default ArchetypeAnalysis;
