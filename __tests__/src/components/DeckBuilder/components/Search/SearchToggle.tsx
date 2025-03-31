import React from "react";

interface SearchToggleProps {
  isAdvancedSearch: boolean;
  setIsAdvancedSearch: (value: boolean) => void;
}

const SearchToggle: React.FC<SearchToggleProps> = ({
  isAdvancedSearch,
  setIsAdvancedSearch,
}) => {
  return (
    <div className="search-toggle">
      <button
        className={isAdvancedSearch ? "" : "active-search"}
        onClick={() => setIsAdvancedSearch(false)}
      >
        Basic Search
      </button>
      <button
        className={isAdvancedSearch ? "active-search" : ""}
        onClick={() => setIsAdvancedSearch(true)}
      >
        Advanced Search
      </button>
    </div>
  );
};

export default SearchToggle;
