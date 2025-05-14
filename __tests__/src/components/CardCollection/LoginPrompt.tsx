import React from "react";
import styled from "styled-components";
import { Lock, LogIn } from "lucide-react";
import theme from "../../styles/theme";
import { Button } from "../UI";

const LoginPrompt: React.FC = () => {
  const handleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/login`;
  };

  return (
    <Container>
      <IconWrapper>
        <Lock size={64} />
      </IconWrapper>
      <Title>Login Required</Title>
      <Description>
        The TCG Card Collection feature is only available to registered users.
        Please log in to access your collection, track your cards, and manage
        their condition and value.
      </Description>
      <Button
        variant="primary"
        size="lg"
        icon={<LogIn size={18} />}
        onClick={handleLogin}
      >
        Login Now
      </Button>
      <SecondaryText>
        Don't have an account?{" "}
        <SignUpLink href={`${import.meta.env.VITE_API_BASE_URL}/auth/register`}>
          Sign up
        </SignUpLink>
      </SecondaryText>
    </Container>
  );
};

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${theme.spacing.xl} ${theme.spacing.lg};
  min-height: 500px;
  background: ${theme.colors.background.paper};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.sm};
  margin-top: ${theme.spacing.xl};
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
  font-size: ${theme.typography.size["2xl"]};
  margin: 0 0 ${theme.spacing.md} 0;
  color: ${theme.colors.text.primary};
`;

const Description = styled.p`
  font-size: ${theme.typography.size.lg};
  color: ${theme.colors.text.secondary};
  max-width: 500px;
  margin: 0 0 ${theme.spacing.xl} 0;
  line-height: 1.6;
`;

const SecondaryText = styled.p`
  font-size: ${theme.typography.size.md};
  color: ${theme.colors.text.secondary};
  margin: ${theme.spacing.lg} 0 0 0;
`;

const SignUpLink = styled.a`
  color: ${theme.colors.primary.main};
  text-decoration: none;
  font-weight: ${theme.typography.weight.medium};

  &:hover {
    text-decoration: underline;
  }
`;

export default LoginPrompt;
