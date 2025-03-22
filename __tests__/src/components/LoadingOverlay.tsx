import React from "react";

export const LoadingOverlay: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      backdropFilter: "blur(3px)",
      zIndex: 1000,
    }}
  >
    <div
      style={{
        color: "#ffffff",
        fontSize: "1.5rem",
        padding: "1rem 2rem",
        borderRadius: "8px",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        boxShadow: "0 0 10px rgba(255, 255, 255, 0.1)",
        textAlign: "center",
      }}
    >
      <div>Waiting for duel data...</div>
      <div
        style={{
          marginTop: "1rem",
          width: "50px",
          height: "50px",
          border: "3px solid rgba(255, 255, 255, 0.3)",
          borderTop: "3px solid #ffffff",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto",
        }}
      />
    </div>
    <style>
      {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}
    </style>
  </div>
);
