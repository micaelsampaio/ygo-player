import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { RulingsAPI, Ruling, RulingCategory } from "./RulingsAPI";
import { Logger } from "../../utils/logger";
import { Link } from "react-router-dom";
import CardTextAnalyzerComponent from "../CardTextAnalyzer/CardTextAnalyzerComponent";
import AppLayout from "../Layout/AppLayout";

// Create a logger instance
const logger = Logger.createLogger("RulingsPage");

const RulingsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [rulings, setRulings] = useState<Ruling[]>([]);
  const [categories, setCategories] = useState<RulingCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRuling, setActiveRuling] = useState<Ruling | null>(null);
  const [activeTab, setActiveTab] = useState<"rulings" | "analyzer">("rulings");

  // Load categories and initial rulings on component mount
  useEffect(() => {
    fetchCategories();
    fetchRecentRulings();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const categoryList = await RulingsAPI.getCategories();
      setCategories(categoryList);
      setIsLoading(false);
    } catch (error) {
      logger.error("Error fetching ruling categories:", error);
      setError("Failed to load ruling categories");
      setIsLoading(false);

      // Fallback to default categories
      setCategories([
        { name: "all", description: "All Rulings", count: 0 },
        { name: "summon", description: "Summoning Mechanics", count: 0 },
        {
          name: "effect-activation",
          description: "Effect Activation",
          count: 0,
        },
        {
          name: "chain-resolution",
          description: "Chains & Resolution",
          count: 0,
        },
        {
          name: "damage-calculation",
          description: "Damage Calculation",
          count: 0,
        },
        {
          name: "card-interactions",
          description: "Card Interactions",
          count: 0,
        },
        { name: "timing", description: "Timing Rules", count: 0 },
        { name: "missing-timing", description: "Missing the Timing", count: 0 },
        {
          name: "once-per-turn",
          description: "Once Per Turn Effects",
          count: 0,
        },
        {
          name: "card-text-psct",
          description: "Card Text Problem Solving",
          count: 0,
        },
      ]);
    }
  };

  const fetchRecentRulings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const rulings = await RulingsAPI.getRulingsByCategory("all");
      setRulings(rulings);
      setIsLoading(false);
    } catch (error) {
      logger.error("Error fetching recent rulings:", error);
      setError("Failed to load rulings");
      setIsLoading(false);

      // Fallback to mock data
      setRulings(RulingsAPI.getMockRulings());
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const results = await RulingsAPI.searchRulings(searchQuery);
      setRulings(results);
      setIsLoading(false);
    } catch (error) {
      logger.error("Error searching rulings:", error);
      setError("Failed to search rulings");
      setIsLoading(false);

      // Fallback - filter mock data
      const filtered = RulingsAPI.getMockRulings().filter(
        (ruling) =>
          ruling.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ruling.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ruling.relatedCards.some((card) =>
            card.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
      setRulings(filtered);
    }
  };

  const handleCategoryChange = async (category: string) => {
    setSelectedCategory(category);
    setIsLoading(true);

    try {
      const rulings = await RulingsAPI.getRulingsByCategory(category);
      setRulings(rulings);
      setIsLoading(false);
    } catch (error) {
      logger.error(`Error getting rulings for category ${category}:`, error);
      setError(`Failed to get rulings for category: ${category}`);
      setIsLoading(false);

      // Fallback - filter mock data
      if (category === "all") {
        setRulings(RulingsAPI.getMockRulings());
      } else {
        const filtered = RulingsAPI.getMockRulings().filter(
          (ruling) => ruling.category === category
        );
        setRulings(filtered);
      }
    }
  };

  return (
    <AppLayout>
      <PageContainer>
        <Header>
          <h1>Yu-Gi-Oh! Rulings Database</h1>
          <p>Your guide to official rulings and card interactions</p>
        </Header>

        <TabContainer>
          <TabButton
            isActive={activeTab === "rulings"}
            onClick={() => setActiveTab("rulings")}
          >
            Card Rulings
          </TabButton>
          <TabButton
            isActive={activeTab === "analyzer"}
            onClick={() => setActiveTab("analyzer")}
          >
            Card Text Analyzer
          </TabButton>
        </TabContainer>

        {activeTab === "rulings" ? (
          <ContentWrapper>
            <Sidebar>
              <h3>Categories</h3>
              <CategoryList>
                {categories.map((category) => (
                  <CategoryItem
                    key={category.name}
                    isSelected={selectedCategory === category.name}
                    onClick={() => handleCategoryChange(category.name)}
                  >
                    {category.description}
                    {category.count > 0 && (
                      <CategoryCount>{category.count}</CategoryCount>
                    )}
                  </CategoryItem>
                ))}
              </CategoryList>
            </Sidebar>

            <MainContent>
              <SearchBar onSubmit={handleSearch}>
                <SearchInput
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for card names, keywords, or specific rulings..."
                />
                <SearchButton type="submit">Search</SearchButton>
              </SearchBar>

              {error && <ErrorMessage>{error}</ErrorMessage>}

              {isLoading ? (
                <LoadingIndicator>Loading rulings...</LoadingIndicator>
              ) : (
                <>
                  <RulingsCount>{rulings.length} rulings found</RulingsCount>

                  <RulingsList>
                    {rulings.map((ruling) => (
                      <RulingItem
                        key={ruling.id}
                        onClick={() => setActiveRuling(ruling)}
                      >
                        <RulingQuestion>{ruling.question}</RulingQuestion>
                        <RulingMeta>
                          {ruling.relatedCards.length > 0 && (
                            <RelatedCards>
                              {ruling.relatedCards.map((card) => (
                                <RelatedCardBadge key={card.id}>
                                  {card.name}
                                </RelatedCardBadge>
                              ))}
                            </RelatedCards>
                          )}
                          <RulingSourceContainer>
                            <RulingSource>
                              Source: {ruling.source} • {ruling.date}
                            </RulingSource>
                            {ruling.sourceUrl && (
                              <SourceLink
                                href={ruling.sourceUrl}
                                target="_blank"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Source
                              </SourceLink>
                            )}
                          </RulingSourceContainer>
                        </RulingMeta>
                      </RulingItem>
                    ))}

                    {rulings.length === 0 && !isLoading && (
                      <NoRulingsMessage>
                        No rulings found. Try a different search term or
                        category.
                      </NoRulingsMessage>
                    )}
                  </RulingsList>
                </>
              )}
            </MainContent>
          </ContentWrapper>
        ) : (
          <CardTextAnalyzerContainer>
            <CardTextAnalyzerComponent />
          </CardTextAnalyzerContainer>
        )}

        {activeRuling && (
          <RulingModal>
            <RulingModalContent>
              <CloseButton onClick={() => setActiveRuling(null)}>×</CloseButton>
              <RulingModalTitle>{activeRuling.question}</RulingModalTitle>
              <RulingModalAnswer>{activeRuling.answer}</RulingModalAnswer>

              {activeRuling.relatedCards.length > 0 && (
                <RulingModalSection>
                  <h4>Related Cards</h4>
                  <RelatedCardsList>
                    {activeRuling.relatedCards.map((card) => (
                      <RelatedCardItem key={card.id}>
                        <img
                          src={`${String(
                            import.meta.env.VITE_YGO_CDN_URL
                          )}/images/cards_small/${card.id}.jpg`}
                          alt={card.name}
                        />
                        <span>{card.name}</span>
                      </RelatedCardItem>
                    ))}
                  </RelatedCardsList>
                </RulingModalSection>
              )}

              <RulingModalSection>
                <h4>Details</h4>
                <RulingDetailsList>
                  <RulingDetailsItem>
                    <strong>Category:</strong>{" "}
                    {activeRuling.category.replace(/-/g, " ")}
                  </RulingDetailsItem>
                  <RulingDetailsItem>
                    <strong>Source:</strong> {activeRuling.source}
                    {activeRuling.sourceUrl && (
                      <SourceLink href={activeRuling.sourceUrl} target="_blank">
                        Visit Source
                      </SourceLink>
                    )}
                  </RulingDetailsItem>
                  <RulingDetailsItem>
                    <strong>Date:</strong> {activeRuling.date}
                  </RulingDetailsItem>
                </RulingDetailsList>
              </RulingModalSection>

              <RulingModalSection>
                <h4>Keywords</h4>
                <KeywordsList>
                  {activeRuling.keywords.map((keyword) => (
                    <KeywordBadge key={keyword}>{keyword}</KeywordBadge>
                  ))}
                </KeywordsList>
              </RulingModalSection>
            </RulingModalContent>
          </RulingModal>
        )}
      </PageContainer>
    </AppLayout>
  );
};

// Styled components for the UI
const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 30px;

  h1 {
    margin: 0;
    color: #333;
  }

  p {
    color: #666;
    margin-top: 10px;
  }
`;

const ContentWrapper = styled.div`
  display: flex;
  gap: 30px;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Sidebar = styled.aside`
  flex: 0 0 250px;

  h3 {
    margin-top: 0;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
  }

  @media (max-width: 768px) {
    flex: 1;
  }
`;

const CategoryList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const CategoryItem = styled.li<{ isSelected: boolean }>`
  padding: 12px 15px;
  margin-bottom: 5px;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;

  background-color: ${(props) => (props.isSelected ? "#2196f3" : "#f5f5f5")};
  color: ${(props) => (props.isSelected ? "white" : "#333")};

  &:hover {
    background-color: ${(props) => (props.isSelected ? "#2196f3" : "#e9e9e9")};
  }
`;

const CategoryCount = styled.span`
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  padding: 2px 8px;
  font-size: 0.8em;
`;

const MainContent = styled.main`
  flex: 1;
`;

const SearchBar = styled.form`
  display: flex;
  margin-bottom: 20px;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 5px 0 0 5px;
  font-size: 16px;

  &:focus {
    outline: none;
    border-color: #2196f3;
  }
`;

const SearchButton = styled.button`
  padding: 12px 20px;
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 0 5px 5px 0;
  cursor: pointer;
  font-size: 16px;

  &:hover {
    background-color: #0d8bf2;
  }
`;

const RulingsCount = styled.div`
  margin-bottom: 15px;
  color: #666;
`;

const RulingsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const RulingItem = styled.div`
  background-color: #fff;
  border: 1px solid #eee;
  border-radius: 5px;
  padding: 15px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  position: relative;

  &:hover {
    border-color: #2196f3;
  }
`;

const RulingQuestion = styled.h3`
  margin-top: 0;
  margin-bottom: 10px;
  color: #333;
`;

const RulingMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const RelatedCards = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`;

const RelatedCardBadge = styled.span`
  background-color: #f0f0f0;
  border-radius: 3px;
  padding: 3px 8px;
  font-size: 0.9em;
  color: #666;
`;

const RulingSourceContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const RulingSource = styled.div`
  font-size: 0.85em;
  color: #888;
`;

const SourceLink = styled.a`
  color: #2196f3;
  font-size: 0.85em;
  text-decoration: none;
  margin-left: 10px;

  &:hover {
    text-decoration: underline;
  }
`;

const ErrorMessage = styled.div`
  background-color: #ffebee;
  color: #c62828;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
`;

const LoadingIndicator = styled.div`
  text-align: center;
  padding: 30px;
  color: #666;
`;

const NoRulingsMessage = styled.div`
  text-align: center;
  padding: 30px;
  background-color: #f9f9f9;
  border-radius: 5px;
  color: #666;
`;

const RulingModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const RulingModalContent = styled.div`
  position: relative;
  background-color: #fff;
  border-radius: 5px;
  padding: 30px;
  width: 800px;
  max-width: 90%;
  max-height: 80vh;
  overflow-y: auto;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;

  &:hover {
    color: #333;
  }
`;

const RulingModalTitle = styled.h2`
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
`;

const RulingModalAnswer = styled.p`
  margin-bottom: 30px;
  line-height: 1.6;
  font-size: 1.1em;
`;

const RulingModalSection = styled.div`
  margin-bottom: 30px;

  h4 {
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 1px solid #eee;
  }
`;

const RelatedCardsList = styled.div`
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
`;

const RelatedCardItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 120px;
  text-align: center;

  img {
    width: 100px;
    border-radius: 5px;
    margin-bottom: 8px;
  }

  span {
    font-size: 0.9em;
  }
`;

const RulingDetailsList = styled.ul`
  list-style: none;
  padding: 0;
`;

const RulingDetailsItem = styled.li`
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const KeywordsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const KeywordBadge = styled.span`
  background-color: #f0f0f0;
  border-radius: 15px;
  padding: 5px 12px;
  font-size: 0.9em;
`;

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 20px;
  border-bottom: 2px solid #eee;
`;

const TabButton = styled.button<{ isActive: boolean }>`
  padding: 12px 20px;
  background: none;
  border: none;
  border-bottom: 3px solid
    ${(props) => (props.isActive ? "#2196f3" : "transparent")};
  color: ${(props) => (props.isActive ? "#2196f3" : "#666")};
  font-size: 16px;
  font-weight: ${(props) => (props.isActive ? "bold" : "normal")};
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 10px;

  &:hover {
    background-color: #f9f9f9;
    color: #2196f3;
  }
`;

const CardTextAnalyzerContainer = styled.div`
  padding: 20px 0;
`;

export default RulingsPage;
