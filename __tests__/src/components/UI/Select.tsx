import React, { SelectHTMLAttributes } from "react";
import styled, { css } from "styled-components";
import theme from "../../styles/theme";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  options: SelectOption[];
  label?: string;
  error?: string;
  helpText?: string;
  fullWidth?: boolean;
  onChange?: (value: string) => void;
  variant?: "outline" | "filled" | "underlined";
}

const Container = styled.div<{ fullWidth?: boolean }>`
  width: ${({ fullWidth }) => (fullWidth ? "100%" : "auto")};
  margin-bottom: ${theme.spacing.md};
`;

const Label = styled.label`
  display: block;
  margin-bottom: ${theme.spacing.xs};
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

const SelectWrapper = styled.div`
  position: relative;
  display: inline-block;
  width: 100%;

  &::after {
    content: "";
    position: absolute;
    right: ${theme.spacing.md};
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid ${theme.colors.text.primary};
    pointer-events: none;
  }
`;

const StyledSelect = styled.select<{
  variant: "outline" | "filled" | "underlined";
  hasError?: boolean;
}>`
  width: 100%;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-size: ${theme.typography.size.base};
  border-radius: ${({ variant }) =>
    variant === "underlined" ? "0" : theme.borderRadius.md};
  outline: none;
  transition: all ${theme.transitions.default};
  appearance: none;
  cursor: pointer;

  ${({ variant }) => variantStyles[variant]}

  ${({ hasError }) =>
    hasError &&
    css`
      border-color: ${theme.colors.error.main} !important;
      &:focus {
        box-shadow: 0 0 0 3px rgba(229, 57, 53, 0.1);
      }
    `}
  
  &:disabled {
    background-color: ${theme.colors.background.card};
    cursor: not-allowed;
    opacity: 0.6;
  }

  /* Hide default arrow in IE */
  &::-ms-expand {
    display: none;
  }
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

const Select = ({
  options,
  label,
  error,
  helpText,
  fullWidth = false,
  onChange,
  variant = "outline",
  ...rest
}: SelectProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <Container fullWidth={fullWidth}>
      {label && <Label>{label}</Label>}
      <SelectWrapper>
        <StyledSelect
          variant={variant}
          hasError={!!error}
          onChange={handleChange}
          {...rest}
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </StyledSelect>
      </SelectWrapper>
      {error && <ErrorText>{error}</ErrorText>}
      {helpText && !error && <HelpText>{helpText}</HelpText>}
    </Container>
  );
};

export default Select;
