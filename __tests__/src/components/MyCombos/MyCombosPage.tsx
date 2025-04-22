import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import theme from "../../styles/theme";
import AppLayout from "../Layout/AppLayout";
import { Button, Card, Badge } from "../UI";

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
    <AppLayout>
      <PageContainer>
        <PageHeader>
          <h1>My Combos</h1>
          <Button variant="primary" onClick={() => navigate("/collections")}>
            Create New Combo
          </Button>
        </PageHeader>

        {isLoading ? (
          <LoadingCard>
            <Card.Content>
              <LoadingText>Loading combos...</LoadingText>
            </Card.Content>
          </LoadingCard>
        ) : combos.length === 0 ? (
          <EmptyStateCard>
            <Card.Content>
              <p>You don't have any combos yet.</p>
              <p>Combos are created in collections.</p>
              <Button
                variant="primary"
                onClick={() => navigate("/collections")}
              >
                Go to Collections
              </Button>
            </Card.Content>
          </EmptyStateCard>
        ) : (
          <ComboGrid>
            {combos.map((combo) => (
              <ComboCard
                key={`${combo.collection}-${combo.id}`}
                elevation="low"
              >
                <Card.Content>
                  <ComboHeader>
                    <ComboTitle>{combo.name}</ComboTitle>
                    <Badge variant="secondary" size="sm" pill>
                      {combo.collectionName || combo.collection}
                    </Badge>
                  </ComboHeader>

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

                  <ButtonContainer>
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={() => handleViewCombo(combo)}
                    >
                      View Combo
                    </Button>
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() =>
                        navigate(`/collections/${combo.collection}`)
                      }
                    >
                      Go to Collection
                    </Button>
                  </ButtonContainer>
                </Card.Content>
              </ComboCard>
            ))}
          </ComboGrid>
        )}
      </PageContainer>
    </AppLayout>
  );
};

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${theme.spacing.lg};
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.xl};

  h1 {
    margin: 0;
    color: ${theme.colors.text.primary};
    font-size: ${theme.typography.size["3xl"]};
  }
`;

const LoadingCard = styled(Card)`
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const LoadingText = styled.div`
  font-size: ${theme.typography.size.lg};
  color: ${theme.colors.text.secondary};
`;

const ButtonContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.md};
`;

const ComboGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: ${theme.spacing.lg};
`;

const ComboCard = styled(Card)`
  transition: transform ${theme.transitions.default},
    box-shadow ${theme.transitions.default};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.md};
  }
`;

const ComboHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${theme.spacing.md};
`;

const ComboTitle = styled.h3`
  margin: 0;
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.lg};
`;

const ComboStats = styled.div`
  display: flex;
  background-color: ${theme.colors.background.card};
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
  margin: ${theme.spacing.md} 0;
`;

const StatItem = styled.div`
  flex: 1;
  padding: ${theme.spacing.md};
  text-align: center;
  border-right: 1px solid ${theme.colors.border.light};

  &:last-child {
    border-right: none;
  }
`;

const StatLabel = styled.div`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing.xs};
`;

const StatValue = styled.div`
  font-size: ${theme.typography.size.lg};
  font-weight: ${theme.typography.weight.semibold};
  color: ${theme.colors.text.primary};
`;

const EmptyStateCard = styled(Card)`
  padding: ${theme.spacing.xl};
  text-align: center;

  p {
    color: ${theme.colors.text.secondary};
    margin-bottom: ${theme.spacing.md};
    font-size: ${theme.typography.size.md};
  }
`;

export default MyCombosPage;
