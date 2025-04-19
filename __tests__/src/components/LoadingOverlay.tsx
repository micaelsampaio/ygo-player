import React from "react";

interface LoadingOverlayProps {
  statusMessage?: string;
  progress?: number; // 0 to 100
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  statusMessage = "Waiting for duel data...",
  progress,
}) => (
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
        padding: "1.5rem 2.5rem",
        borderRadius: "8px",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        boxShadow: "0 0 15px rgba(255, 255, 255, 0.15)",
        textAlign: "center",
        maxWidth: "80%",
      }}
    >
      <div>{statusMessage}</div>
      
      {progress !== undefined ? (
        <div style={{ marginTop: "1rem", width: "100%" }}>
          <div style={{ 
            width: "100%", 
            height: "10px", 
            backgroundColor: "rgba(255,255,255,0.2)", 
            borderRadius: "5px",
            overflow: "hidden"
          }}>
            <div style={{
              width: `${progress}%`,
              height: "100%",
              backgroundColor: "#3498db",
              borderRadius: "5px",
              transition: "width 0.3s ease-in-out"
            }}/>
          </div>
          <div style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
            {progress}% complete
          </div>
        </div>
      ) : (
        <div
          style={{
            marginTop: "1.5rem",
            width: "60px",
            height: "60px",
            border: "4px solid rgba(255, 255, 255, 0.3)",
            borderTop: "4px solid #3498db",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto",
          }}
        />
      )}
      
      <div style={{ fontSize: "0.9rem", marginTop: "1rem", opacity: 0.7 }}>
        This may take a moment...
      </div>
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
