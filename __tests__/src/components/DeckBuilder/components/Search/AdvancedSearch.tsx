import React from "react";
import { SearchFilters } from "../types";

interface AdvancedSearchProps {
  searchFilters: SearchFilters;
  onFilterChange: (key: keyof SearchFilters, value: string) => void;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  searchFilters,
  onFilterChange,
}) => {
  return (
    <div className="advanced-search">
      <div className="filter-row name-text-row">
        <div className="filter-field">
          <label>Card Name</label>
          <input
            type="text"
            value={searchFilters.name}
            onChange={(e) => onFilterChange("name", e.target.value)}
            placeholder="Card name..."
          />
        </div>

        <div className="filter-field">
          <label>Card Text</label>
          <input
            type="text"
            value={searchFilters.text}
            onChange={(e) => onFilterChange("text", e.target.value)}
            placeholder="Card text..."
          />
        </div>
      </div>

      <div className="filter-row">
        <div className="filter-field">
          <label>Card Frame</label>
          <select
            value={searchFilters.type}
            onChange={(e) => onFilterChange("type", e.target.value)}
          >
            <option value="">Any Frame</option>
            {/* Normal Monsters */}
            <option value="Normal Monster">Normal Monster</option>
            <option value="Normal Tuner Monster">Normal Tuner Monster</option>
            <option value="Pendulum Normal Monster">
              Pendulum Normal Monster
            </option>

            {/* Effect Monsters */}
            <option value="Tuner Monster">Tuner Monster</option>
            <option value="Flip Monster">Flip Monster</option>
            <option value="Flip Effect Monster">Flip Effect Monster</option>
            <option value="Spirit Monster">Spirit Monster</option>
            <option value="Union Effect Monster">Union Effect Monster</option>
            <option value="Gemini Monster">Gemini Monster</option>
            <option value="Toon Monster">Toon Monster</option>

            {/* Pendulum */}
            <option value="Pendulum Effect Monster">
              Pendulum Effect Monster
            </option>
            <option value="Pendulum Tuner Effect Monster">
              Pendulum Tuner Effect Monster
            </option>
            <option value="Pendulum Flip Effect Monster">
              Pendulum Flip Effect Monster
            </option>

            {/* Extra Deck */}
            <option value="Fusion Monster">Fusion Monster</option>
            <option value="Pendulum Effect Fusion Monster">
              Pendulum Effect Fusion Monster
            </option>
            <option value="Synchro Monster">Synchro Monster</option>
            <option value="Synchro Tuner Monster">Synchro Tuner Monster</option>
            <option value="Synchro Pendulum Effect Monster">
              Synchro Pendulum Effect Monster
            </option>
            <option value="XYZ Monster">XYZ Monster</option>
            <option value="XYZ Pendulum Effect Monster">
              XYZ Pendulum Effect Monster
            </option>
            <option value="Link Monster">Link Monster</option>

            {/* Ritual */}
            <option value="Ritual Monster">Ritual Monster</option>
            <option value="Ritual Effect Monster">Ritual Effect Monster</option>
            <option value="Pendulum Effect Ritual Monster">
              Pendulum Effect Ritual Monster
            </option>

            {/* Spells & Traps */}
            <option value="Spell Card">Spell Card</option>
            <option value="Trap Card">Trap Card</option>

            {/* Other */}
            <option value="Token">Token</option>
            <option value="Skill Card">Skill Card</option>
          </select>
        </div>

        <div className="filter-field">
          <label>Attribute</label>
          <select
            value={searchFilters.attribute}
            onChange={(e) => onFilterChange("attribute", e.target.value)}
          >
            <option value="">Any Attribute</option>
            <option value="DARK">DARK</option>
            <option value="LIGHT">LIGHT</option>
            <option value="EARTH">EARTH</option>
            <option value="WATER">WATER</option>
            <option value="FIRE">FIRE</option>
            <option value="WIND">WIND</option>
            <option value="DIVINE">DIVINE</option>
          </select>
        </div>
      </div>

      <div className="filter-row">
        <div className="filter-field">
          <label>Level/Rank</label>
          <select
            value={searchFilters.level}
            onChange={(e) => onFilterChange("level", e.target.value)}
          >
            <option value="">Any Level</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((level) => (
              <option key={level} value={level.toString()}>
                {level}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label>Type</label>
          <select
            value={searchFilters.race}
            onChange={(e) => onFilterChange("race", e.target.value)}
          >
            <option value="">Any Type</option>
            <option value="Aqua">Aqua</option>
            <option value="Beast">Beast</option>
            <option value="Beast-Warrior">Beast-Warrior</option>
            <option value="Cyberse">Cyberse</option>
            <option value="Dinosaur">Dinosaur</option>
            <option value="Divine-Beast">Divine-Beast</option>
            <option value="Dragon">Dragon</option>
            <option value="Fairy">Fairy</option>
            <option value="Fiend">Fiend</option>
            <option value="Fish">Fish</option>
            <option value="Insect">Insect</option>
            <option value="Machine">Machine</option>
            <option value="Plant">Plant</option>
            <option value="Psychic">Psychic</option>
            <option value="Pyro">Pyro</option>
            <option value="Reptile">Reptile</option>
            <option value="Rock">Rock</option>
            <option value="Sea Serpent">Sea Serpent</option>
            <option value="Spellcaster">Spellcaster</option>
            <option value="Thunder">Thunder</option>
            <option value="Warrior">Warrior</option>
            <option value="Winged Beast">Winged Beast</option>
            <option value="Wyrm">Wyrm</option>
            <option value="Zombie">Zombie</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearch;
