import React, { useEffect } from "react";
import CardTextAnalyzerComponent from "../components/CardTextAnalyzer/CardTextAnalyzerComponent";

const CardTextAnalyzerPage: React.FC = () => {
  // Set document title programmatically instead of using Helmet
  useEffect(() => {
    document.title = "Card Text Analyzer - Yu-Gi-Oh!";
  }, []);

  return (
    <>
      <CardTextAnalyzerComponent />
    </>
  );
};

export default CardTextAnalyzerPage;
