import React from "react";

interface BasicSearchProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
}

const BasicSearch: React.FC<BasicSearchProps> = ({
  searchTerm,
  onSearchTermChange,
}) => {
  return (
    <div className="card-search">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        placeholder="Search card name..."
      />
    </div>
  );
};

export default BasicSearch;
