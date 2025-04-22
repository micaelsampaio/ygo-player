import styled, { css } from "styled-components";
import { ReactNode, FC } from "react";
import theme from "../../styles/theme";

// Types
interface CardProps {
  children: ReactNode;
  elevation?: "none" | "low" | "medium" | "high";
  padding?: string;
  background?: string;
  fullWidth?: boolean;
  border?: boolean;
  className?: string;
}

interface CardHeaderProps {
  className?: string;
  children: ReactNode;
}

interface CardContentProps {
  className?: string;
  children: ReactNode;
}

interface CardFooterProps {
  className?: string;
  children: ReactNode;
}

interface CardTitleProps {
  className?: string;
  children: ReactNode;
}

// Elevation styles based on theme shadows
const elevationStyles = {
  none: css`
    box-shadow: none;
  `,
  low: css`
    box-shadow: ${theme.shadows.sm};
  `,
  medium: css`
    box-shadow: ${theme.shadows.md};
  `,
  high: css`
    box-shadow: ${theme.shadows.lg};
  `,
};

// Styled components
const StyledCard = styled.div<CardProps>`
  background-color: ${({ background }) =>
    background || theme.colors.background.paper};
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
  padding: ${({ padding }) => padding || "0"};
  border: ${({ border }) =>
    border ? `1px solid ${theme.colors.border.default}` : "none"};
  width: ${({ fullWidth }) => (fullWidth ? "100%" : "auto")};
  ${({ elevation = "medium" }) => elevationStyles[elevation]}
  transition: box-shadow ${theme.transitions.default};
`;

const StyledCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.border.light};
`;

const StyledCardContent = styled.div`
  padding: ${theme.spacing.md};
`;

const StyledCardFooter = styled.div`
  padding: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border.light};
`;

const StyledCardTitle = styled.h3`
  margin: 0;
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.lg};
  font-weight: ${theme.typography.weight.semibold};
`;

// Components
const CardHeader: FC<CardHeaderProps> = ({ children, className }) => (
  <StyledCardHeader className={className}>{children}</StyledCardHeader>
);

const CardContent: FC<CardContentProps> = ({ children, className }) => (
  <StyledCardContent className={className}>{children}</StyledCardContent>
);

const CardFooter: FC<CardFooterProps> = ({ children, className }) => (
  <StyledCardFooter className={className}>{children}</StyledCardFooter>
);

const CardTitle: FC<CardTitleProps> = ({ children, className }) => (
  <StyledCardTitle className={className}>{children}</StyledCardTitle>
);

const Card: FC<CardProps> & {
  Header: FC<CardHeaderProps>;
  Content: FC<CardContentProps>;
  Footer: FC<CardFooterProps>;
  Title: FC<CardTitleProps>;
} = ({
  children,
  elevation = "medium",
  padding,
  background,
  fullWidth = false,
  border = false,
  className,
}) => {
  return (
    <StyledCard
      elevation={elevation}
      padding={padding}
      background={background}
      fullWidth={fullWidth}
      border={border}
      className={className}
    >
      {children}
    </StyledCard>
  );
};

// Attach the sub-components
Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;
Card.Title = CardTitle;

export default Card;
