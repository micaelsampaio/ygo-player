import React from 'react';

interface StrengthWeaknessPanelProps {
  strengths: string[];
  weaknesses: string[];
  counters: string[];
  techs: string[];
}

const StrengthWeaknessPanel: React.FC<StrengthWeaknessPanelProps> = ({ 
  strengths, 
  weaknesses, 
  counters, 
  techs 
}) => {
  return (
    <div className="strength-weakness-panel">
      <div className="analysis-row">
        <div className="analysis-col">
          <div className="analysis-card strengths">
            <h3>Deck Strengths</h3>
            <ul>
              {strengths.map((strength, index) => (
                <li key={index}>
                  <span className="strength-icon">✓</span> {strength}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="analysis-col">
          <div className="analysis-card weaknesses">
            <h3>Deck Weaknesses</h3>
            <ul>
              {weaknesses.map((weakness, index) => (
                <li key={index}>
                  <span className="weakness-icon">✗</span> {weakness}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      <div className="analysis-row">
        <div className="analysis-col">
          <div className="analysis-card counters">
            <h3>Counters Against Your Deck</h3>
            <p className="help-text">Ways opponents might counter your strategy</p>
            <ul>
              {counters.map((counter, index) => (
                <li key={index}>
                  <span className="counter-icon">⚡</span> {counter}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="analysis-col">
          <div className="analysis-card techs">
            <h3>Recommended Tech Cards</h3>
            <p className="help-text">Cards to consider adding to strengthen your deck</p>
            <ul>
              {techs.map((tech, index) => (
                <li key={index}>
                  <span className="tech-icon">+</span> {tech}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      <div className="improvement-tips">
        <h3>Improvement Tips</h3>
        <div className="tips-content">
          <p>Based on your deck's weaknesses, consider the following improvements:</p>
          <ul>
            {weaknesses.slice(0, 3).map((weakness, index) => {
              // Generate a contextual tip based on the weakness
              let tip = '';
              if (weakness.toLowerCase().includes('disruption')) {
                tip = 'Add cards that can play through disruption or prevent it, like Called by the Grave';
              } else if (weakness.toLowerCase().includes('backrow')) {
                tip = 'Consider adding backrow removal like Twin Twisters or Lightning Storm';
              } else if (weakness.toLowerCase().includes('resource')) {
                tip = 'Add draw power or recycling effects to improve resource management';
              } else if (weakness.toLowerCase().includes('recovery')) {
                tip = 'Include cards with graveyard recovery effects like Monster Reborn';
              } else if (weakness.toLowerCase().includes('consistency')) {
                tip = 'Add more search cards or card filtering to improve consistency';
              } else {
                tip = `Address "${weakness}" by researching counters to this weakness`;
              }
              
              return (
                <li key={index}>
                  <strong>For "{weakness}":</strong> {tip}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StrengthWeaknessPanel;