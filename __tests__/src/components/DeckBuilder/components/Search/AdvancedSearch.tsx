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
      <div className="filter-row">
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
          <label>Type</label>
          <select
            value={searchFilters.type}
            onChange={(e) => onFilterChange("type", e.target.value)}
          >
            <option value="">Any Type</option>
            <option value="Effect Monster">Effect Monster</option>
            <option value="Normal Monster">Normal Monster</option>
            <option value="Ritual Monster">Ritual Monster</option>
            <option value="Fusion Monster">Fusion Monster</option>
            <option value="Synchro Monster">Synchro Monster</option>
            <option value="XYZ Monster">XYZ Monster</option>
            <option value="Link Monster">Link Monster</option>
            <option value="Spell Card">Spell Card</option>
            <option value="Trap Card">Trap Card</option>
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
          <label>Race</label>
          <select
            value={searchFilters.race}
            onChange={(e) => onFilterChange("race", e.target.value)}
          >
            <option value="">Any Race</option>
            <option value="Aqua">Aqua</option>
            <option value="Beast">Beast</option>
            <option value="Beast-Warrior">Beast-Warrior</option>
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
            <option value="Zombie">Zombie</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearch;
