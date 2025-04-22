import React, { InputHTMLAttributes } from "react";
import styled, { css } from "styled-components";
import theme from "../../styles/theme";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  variant?: "outline" | "filled" | "underlined";
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  labelPosition?: "top" | "left";
}

const Container = styled.div<{ fullWidth?: boolean; labelPosition?: string }>`
  display: ${({ labelPosition }) =>
    labelPosition === "left" ? "flex" : "block"};
  align-items: ${({ labelPosition }) =>
    labelPosition === "left" ? "center" : "stretch"};
  gap: ${theme.spacing.md};
  width: ${({ fullWidth }) => (fullWidth ? "100%" : "auto")};
  margin-bottom: ${theme.spacing.md};
`;

const Label = styled.label`
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  font-size: ${theme.typography.size.sm};
  font-weight: ${theme.typography.weight.medium};
  color: ${theme.colors.text.primary};
`;

const variantStyles = {
  outline: css`
    border: 1px solid ${theme.colors.border.default};
    background-color: ${theme.colors.background.paper};
    &:focus {
      border-color: ${theme.colors.primary.main};
      box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.1);
    }
  `,
  filled: css`
    border: 1px solid transparent;
    background-color: ${theme.colors.background.card};
    &:focus {
      background-color: ${theme.colors.background.paper};
      border-color: ${theme.colors.primary.main};
    }
  `,
  underlined: css`
    border: none;
    border-bottom: 2px solid ${theme.colors.border.default};
    background-color: transparent;
    border-radius: 0;
    padding-left: 0;
    padding-right: 0;
    &:focus {
      border-bottom-color: ${theme.colors.primary.main};
    }
  `,
};

const InputWrapper = styled.div<{ hasError?: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;

  svg {
    position: absolute;
    pointer-events: none;
    color: ${theme.colors.text.secondary};
  }
`;

const StyledInput = styled.input<{
  variant: "outline" | "filled" | "underlined";
  hasError?: boolean;
  hasLeftIcon?: boolean;
  hasRightIcon?: boolean;
}>`
  width: 100%;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-size: ${theme.typography.size.base};
  border-radius: ${({ variant }) =>
    variant === "underlined" ? "0" : theme.borderRadius.md};
  outline: none;
  transition: all ${theme.transitions.default};

  ${({ variant }) => variantStyles[variant]}

  ${({ hasError }) =>
    hasError &&
    css`
      border-color: ${theme.colors.error.main} !important;
      &:focus {
        box-shadow: 0 0 0 3px rgba(229, 57, 53, 0.1);
      }
    `}
    
  padding-left: ${({ hasLeftIcon }) =>
    hasLeftIcon ? theme.spacing.xl : theme.spacing.md};
  padding-right: ${({ hasRightIcon }) =>
    hasRightIcon ? theme.spacing.xl : theme.spacing.md};

  ::placeholder {
    color: ${theme.colors.text.secondary};
    opacity: 0.7;
  }

  &:disabled {
    background-color: ${theme.colors.background.card};
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const LeftIconContainer = styled.div`
  position: absolute;
  left: ${theme.spacing.sm};
  color: ${theme.colors.text.secondary};
  display: flex;
  align-items: center;
`;

const RightIconContainer = styled.div`
  position: absolute;
  right: ${theme.spacing.sm};
  color: ${theme.colors.text.secondary};
  display: flex;
  align-items: center;
`;

const ErrorText = styled.p`
  color: ${theme.colors.error.main};
  font-size: ${theme.typography.size.sm};
  margin: ${theme.spacing.xs} 0 0;
`;

const HelpText = styled.p`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.sm};
  margin: ${theme.spacing.xs} 0 0;
`;

const TextField = ({
  label,
  error,
  helpText,
  variant = "outline",
  fullWidth = false,
  leftIcon,
  rightIcon,
  labelPosition = "top",
  ...rest
}: TextFieldProps) => {
  return (
    <Container fullWidth={fullWidth} labelPosition={labelPosition}>
      {label && <Label>{label}</Label>}
      <div style={{ flex: 1 }}>
        <InputWrapper hasError={!!error}>
          {leftIcon && <LeftIconContainer>{leftIcon}</LeftIconContainer>}
          <StyledInput
            variant={variant}
            hasError={!!error}
            hasLeftIcon={!!leftIcon}
            hasRightIcon={!!rightIcon}
            {...rest}
          />
          {rightIcon && <RightIconContainer>{rightIcon}</RightIconContainer>}
        </InputWrapper>
        {error && <ErrorText>{error}</ErrorText>}
        {helpText && !error && <HelpText>{helpText}</HelpText>}
      </div>
    </Container>
  );
};

export default TextField;
