import React from "react";

const ProbabilityFormula = () => (
  <div className="formula-container">
    <div className="formula">P(success) = 1 - C(40-k, n) / C(40, n)</div>
    <div className="formula-key">
      <ul>
        <li>
          <strong>k</strong>: Number of copies of a card
        </li>
        <li>
          <strong>n</strong>: Number of cards drawn (usually 5 for opening hand)
        </li>
        <li>
          <strong>C(a,b)</strong>: Combinations of a choose b
        </li>
      </ul>
    </div>
    <p>
      Using hypergeometric distribution to calculate exact probabilities in a
      40-card deck:
    </p>
    <ul className="probability-examples">
      <li>
        <strong>3 copies</strong>: 33.76% chance to open with at least 1
      </li>
      <li>
        <strong>2 copies</strong>: 23.71% chance to open with at least 1
      </li>
      <li>
        <strong>1 copy</strong>: 12.50% chance to open with it
      </li>
    </ul>
  </div>
);

export default ProbabilityFormula;
