import React from "react";
import styled from "styled-components";
import { Database, Plus } from "lucide-react";
import theme from "../../styles/theme";
import { Button } from "../UI";

interface EmptyCollectionStateProps {
  onCreateCollection: () => void;
}

const EmptyCollectionState: React.FC<EmptyCollectionStateProps> = ({
  onCreateCollection,
}) => {
  return (
    <Container>
      <IconWrapper>
        <Database size={64} />
      </IconWrapper>
      <Title>No Collections Found</Title>
      <Description>
        Create your first TCG card collection to start tracking your cards,
        their conditions, values, and more.
      </Description>
      <Button
        variant="primary"
        size="lg"
        icon={<Plus size={18} />}
        onClick={onCreateCollection}
      >
        Create Your First Collection
      </Button>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${theme.spacing.xl} ${theme.spacing.lg};
  min-height: 400px;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: ${theme.colors.background.default};
  color: ${theme.colors.primary.main};
  margin-bottom: ${theme.spacing.lg};
`;

const Title = styled.h2`
  font-size: ${theme.typography.size.xl};
  margin: 0 0 ${theme.spacing.md} 0;
  color: ${theme.colors.text.primary};
`;

const Description = styled.p`
  font-size: ${theme.typography.size.md};
  color: ${theme.colors.text.secondary};
  max-width: 500px;
  margin: 0 0 ${theme.spacing.xl} 0;
`;

export default EmptyCollectionState;
