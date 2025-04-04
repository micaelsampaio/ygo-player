import React from "react";
import { DeckAnalyticsType } from "../types";

interface ImprovementTipsProps {
  analytics: DeckAnalyticsType;
}

const ImprovementTips: React.FC<ImprovementTipsProps> = ({ analytics }) => (
  <ul className="tips-list">
    {analytics.monsterCount < 14 && (
      <li>Consider adding more monster cards for better field presence.</li>
    )}
    {analytics.spellCount < 10 && (
      <li>Adding more spell cards could improve your resource generation.</li>
    )}
    {analytics.trapCount < 5 && (
      <li>Including trap cards would provide better disruption options.</li>
    )}
    {analytics.consistencyScore < 70 && (
      <li>Increase consistency by adding more copies of your key cards.</li>
    )}
    {!Object.entries(analytics.attributeDistribution).some(
      ([_, count]) => count > 7
    ) && (
      <li>
        Consider focusing on a dominant attribute to leverage attribute-specific
        support cards.
      </li>
    )}
  </ul>
);

export default ImprovementTips;
