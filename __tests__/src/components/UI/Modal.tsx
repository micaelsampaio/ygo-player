import React, { ReactNode, useEffect } from "react";
import ReactDOM from "react-dom";
import styled, { css, keyframes } from "styled-components";
import theme from "../../styles/theme";
import Button from "./Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  closeOnEsc?: boolean;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  footer?: ReactNode;
}

// Animations
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const zoomIn = keyframes`
  from { transform: scale(0.95); }
  to { transform: scale(1); }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${theme.zIndices.modal};
  animation: ${fadeIn} 0.2s ease-out;
  overflow-y: auto;
  padding: ${theme.spacing.md};
`;

const getModalSize = (size: string) => {
  switch (size) {
    case "sm":
      return css`
        max-width: 400px;
      `;
    case "md":
      return css`
        max-width: 600px;
      `;
    case "lg":
      return css`
        max-width: 800px;
      `;
    case "xl":
      return css`
        max-width: 1000px;
      `;
    case "full":
      return css`
        max-width: calc(100vw - 64px);
        max-height: calc(100vh - 64px);
      `;
    default:
      return css`
        max-width: 600px;
      `;
  }
};

const ModalContainer = styled.div<{ size: string }>`
  background-color: ${theme.colors.background.paper};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.lg};
  width: 100%;
  ${(props) => getModalSize(props.size)}
  display: flex;
  flex-direction: column;
  animation: ${fadeIn} 0.2s ease-out, ${zoomIn} 0.2s ease-out;
  max-height: calc(100vh - 64px);
`;

const ModalHeader = styled.div`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: ${theme.typography.size.lg};
  font-weight: ${theme.typography.weight.semibold};
  color: ${theme.colors.text.primary};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${theme.colors.background.card};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.primary.main};
  }
`;

const CloseIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12.5 3.5L3.5 12.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3.5 3.5L12.5 12.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ModalBody = styled.div`
  padding: ${theme.spacing.lg};
  overflow-y: auto;
  flex: 1;
`;

const ModalFooter = styled.div`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.border.light};
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.sm};
`;

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  closeOnEsc = true,
  closeOnOverlayClick = true,
  showCloseButton = true,
  footer,
}) => {
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (closeOnEsc && event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeOnEsc, onClose]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContainer size={size} onClick={(e) => e.stopPropagation()}>
        {(title || showCloseButton) && (
          <ModalHeader>
            {title && <ModalTitle>{title}</ModalTitle>}
            {showCloseButton && (
              <CloseButton onClick={onClose} aria-label="Close">
                <CloseIcon />
              </CloseButton>
            )}
          </ModalHeader>
        )}
        <ModalBody>{children}</ModalBody>
        {footer && <ModalFooter>{footer}</ModalFooter>}
      </ModalContainer>
    </ModalOverlay>,
    document.body
  );
};

// Example usage component to make it easier to implement modals
export const useModal = (initialState = false) => {
  const [isOpen, setIsOpen] = React.useState(initialState);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  return { isOpen, open, close, toggle };
};

// For consistency, let's add some default footer configurations
export const ModalFooterActions: React.FC<{
  onCancel?: () => void;
  onConfirm: () => void;
  cancelText?: string;
  confirmText?: string;
  confirmVariant?: "primary" | "secondary" | "danger";
}> = ({
  onCancel,
  onConfirm,
  cancelText = "Cancel",
  confirmText = "Confirm",
  confirmVariant = "primary",
}) => {
  return (
    <>
      {onCancel && (
        <Button variant="tertiary" onClick={onCancel}>
          {cancelText}
        </Button>
      )}
      <Button variant={confirmVariant} onClick={onConfirm}>
        {confirmText}
      </Button>
    </>
  );
};

export default Modal;
