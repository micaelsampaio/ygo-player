import React, { useState, useEffect } from "react";
import { useKaibaNet } from "../hooks/useKaibaNet";

interface OfflineNotificationProps {
  onTryReconnect?: () => void;
}

const OfflineNotification: React.FC<OfflineNotificationProps> = ({
  onTryReconnect,
}) => {
  const [visible, setVisible] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const kaibaNet = useKaibaNet();

  // Check if we're in offline mode when the component mounts
  useEffect(() => {
    setVisible(kaibaNet.getCommunicationType() === "offline");

    // Listen for offline mode activation
    const handleOfflineMode = () => {
      setVisible(true);
    };

    kaibaNet.on("offline:mode:activated", handleOfflineMode);

    return () => {
      kaibaNet.off("offline:mode:activated", handleOfflineMode);
    };
  }, [kaibaNet]);

  // Handle reconnection attempt
  const handleTryReconnect = async () => {
    setIsChecking(true);

    try {
      // Try to switch to socket.io mode
      await kaibaNet.switchCommunication("socketio");
      setVisible(false);
      if (onTryReconnect) {
        onTryReconnect();
      }
    } catch (error) {
      // If reconnection fails, stay in offline mode
      console.error("Reconnection failed:", error);
    } finally {
      setIsChecking(false);
    }
  };

  // Handle close button click
  const handleClose = () => {
    setVisible(false);
  };

  // If not in offline mode or notification is dismissed, don't render anything
  if (!visible) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        left: "20px",
        backgroundColor: "rgba(40, 40, 40, 0.9)",
        color: "white",
        padding: "12px 16px",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        maxWidth: "280px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: "orange",
              marginRight: "6px",
            }}
          />
          <span style={{ fontWeight: "bold" }}>Offline Mode</span>
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          aria-label="Close notification"
          style={{
            background: "none",
            border: "none",
            color: "white",
            fontSize: "16px",
            cursor: "pointer",
            padding: "4px",
            marginLeft: "8px",
            opacity: 0.7,
            transition: "opacity 0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseOut={(e) => (e.currentTarget.style.opacity = "0.7")}
        >
          ×
        </button>
      </div>

      <p style={{ margin: "0", fontSize: "14px" }}>
        You're playing in offline mode. Some features like multiplayer might be
        limited.
      </p>

      <button
        onClick={handleTryReconnect}
        disabled={isChecking}
        style={{
          backgroundColor: "#3498db",
          color: "white",
          border: "none",
          padding: "6px 10px",
          borderRadius: "4px",
          cursor: isChecking ? "wait" : "pointer",
          opacity: isChecking ? 0.7 : 1,
        }}
      >
        {isChecking ? "Checking connection..." : "Try to reconnect"}
      </button>
    </div>
  );
};

export default OfflineNotification;
