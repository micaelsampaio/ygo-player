import React, { useEffect } from "react";
import "../styles/AnalyticsTab.css";

interface AnalyticsTabProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    // Add body class to prevent scrolling when modal is open
    if (isOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }

    // Handle escape key press
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.classList.remove("modal-open");
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="analytics-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-container">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-modal" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-content">{children}</div>
      </div>
    </div>
  );
};

export default AnalyticsTab;
