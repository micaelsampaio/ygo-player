import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";

interface Combo {
  id: string;
  name: string;
  collection: string;
  collectionName?: string;
  deck: {
    mainDeck: number[];
    extraDeck: number[];
  };
  logs: any[];
}

interface Collection {
  id: string;
  name: string;
  combos: Combo[];
}

const MyCombosPage = () => {
  const navigate = useNavigate();
  const [combos, setCombos] = useState<Combo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const cdnUrl = String(import.meta.env.VITE_YGO_CDN_URL);

  useEffect(() => {
    // Load all collections to extract combos
    const allKeys = Object.keys(localStorage);
    const collectionKeys = allKeys.filter((key) => key.startsWith("c_"));
    const allCombos: Combo[] = [];

    // Load collections
    for (const key of collectionKeys) {
      try {
        const collection: Collection = JSON.parse(
          localStorage.getItem(key) || "{}"
        );
        if (collection.combos && Array.isArray(collection.combos)) {
          // Add collection name to each combo
          const combosWithCollection = collection.combos.map((combo) => ({
            ...combo,
            collectionName: collection.name,
          }));
          allCombos.push(...combosWithCollection);
        }
      } catch (error) {
        console.error(`Error parsing collection ${key}:`, error);
      }
    }

    setCombos(allCombos);
    setIsLoading(false);
  }, []);

  const handleViewCombo = (combo: Combo) => {
    // Store combo data for viewing
    localStorage.setItem("current-combo", JSON.stringify(combo));
    navigate(`/spreadsheet/collection/${combo.collection}/${combo.id}`);
  };

  return (
    <PageContainer>
      <Header>
        <h1>My Combos</h1>
        <Button onClick={() => navigate("/")}>Create New Combo</Button>
      </Header>

      {isLoading ? (
        <Loading>Loading combos...</Loading>
      ) : combos.length === 0 ? (
        <EmptyState>
          <p>You don't have any combos yet.</p>
          <p>Combos are created in collections.</p>
          <Button onClick={() => navigate("/collections")}>
            Go to Collections
          </Button>
        </EmptyState>
      ) : (
        <ComboGrid>
          {combos.map((combo) => (
            <ComboCard key={`${combo.collection}-${combo.id}`}>
              <ComboTitle>{combo.name}</ComboTitle>
              <ComboCollectionName>
                Collection: {combo.collectionName || combo.collection}
              </ComboCollectionName>
              <ComboStats>
                <StatItem>
                  <StatLabel>Steps</StatLabel>
                  <StatValue>{combo.logs?.length || 0}</StatValue>
                </StatItem>
                <StatItem>
                  <StatLabel>Cards Used</StatLabel>
                  <StatValue>
                    {Array.isArray(combo.logs)
                      ? new Set(
                          combo.logs.flatMap(
                            (log) => log.cards?.map((c: any) => c.id) || []
                          )
                        ).size
                      : 0}
                  </StatValue>
                </StatItem>
              </ComboStats>
              <ButtonGroup>
                <Button primary onClick={() => handleViewCombo(combo)}>
                  View Combo
                </Button>
                <Button
                  onClick={() => navigate(`/collections/${combo.collection}`)}
                >
                  Go to Collection
                </Button>
              </ButtonGroup>
            </ComboCard>
          ))}
        </ComboGrid>
      )}
    </PageContainer>
  );
};

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;

  h1 {
    margin: 0;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
`;

const Button = styled.button<{ primary?: boolean }>`
  padding: 8px 16px;
  background-color: ${(props) => (props.primary ? "#0078d4" : "#2a2a2a")};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${(props) => (props.primary ? "#0056b3" : "#444")};
  }
`;

const ComboGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
`;

const ComboCard = styled.div`
  background-color: #2a2a2a;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const ComboTitle = styled.h3`
  margin: 0;
  color: white;
`;

const ComboCollectionName = styled.div`
  color: #999;
  font-size: 14px;
`;

const ComboStats = styled.div`
  display: flex;
  background-color: #222;
  border-radius: 6px;
  overflow: hidden;
  margin: 10px 0;
`;

const StatItem = styled.div`
  flex: 1;
  padding: 10px;
  text-align: center;
  border-right: 1px solid #333;

  &:last-child {
    border-right: none;
  }
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: #999;
  margin-bottom: 5px;
`;

const StatValue = styled.div`
  font-size: 16px;
  font-weight: bold;
  color: white;
`;

const Loading = styled.div`
  text-align: center;
  padding: 50px;
  font-size: 16px;
  color: #999;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 50px;
  background-color: #2a2a2a;
  border-radius: 8px;
  color: white;
`;

export default MyCombosPage;
