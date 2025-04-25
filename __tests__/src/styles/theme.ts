// Design system for YGO Player application

const theme = {
  colors: {
    primary: {
      main: "#0078d4", // Microsoft blue - used extensively in your UI
      light: "#0086ef",
      dark: "#0056b3",
    },
    secondary: {
      main: "#673ab7", // Purple - alternative accent color
      light: "#7e57c2",
      dark: "#5e35b1",
    },
    success: {
      main: "#22c55e", // Green - used for success states
      light: "#4caf50",
      dark: "#1b5e20",
    },
    error: {
      main: "#e53935", // Red - used for error states
      light: "#f44336",
      dark: "#c0392b",
    },
    warning: {
      main: "#ff9800", // Orange - used for warning states
      light: "#ffb74d",
      dark: "#f57c00",
    },
    info: {
      main: "#2196f3", // Light blue - used for info states
      light: "#64b5f6",
      dark: "#1976d2",
    },
    background: {
      default: "#f5f5f5", // Light gray - main background
      paper: "#ffffff", // White - card backgrounds
      card: "#f9f9f9", // Very light gray - alternate backgrounds
      dark: "#2a2a2a", // Dark gray - used in some components
    },
    text: {
      primary: "#333333", // Dark gray - main text
      secondary: "#666666", // Medium gray - secondary text
      disabled: "#999999", // Light gray - disabled text
      inverse: "#ffffff", // White - text on dark backgrounds
    },
    border: {
      default: "#e0e0e0", // Light gray - default borders
      light: "#eeeeee", // Very light gray - light borders
      dark: "#cccccc", // Medium gray - dark borders
    },
    action: {
      active: "#0078d4", // Primary blue - active states
      hover: "#f5f5f5", // Very light gray - hover states
      selected: "#e3f2fd", // Very light blue - selected states
      disabled: "#f5f5f5", // Light gray - disabled states
    },
  },

  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
    size: {
      xs: "0.75rem",    // 12px
      sm: "0.875rem",   // 14px
      base: "1rem",     // 16px
      md: "1.125rem",   // 18px
      lg: "1.25rem",    // 20px
      xl: "1.5rem",     // 24px
      "2xl": "1.875rem", // 30px
      "3xl": "2.25rem",  // 36px
      "4xl": "3rem",     // 48px
    },
    weight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      none: "1",
      tight: "1.25",
      normal: "1.5",
      loose: "1.75",
    },
  },

  spacing: {
    xs: "0.25rem", // 4px
    sm: "0.5rem", // 8px
    md: "1rem", // 16px
    lg: "1.5rem", // 24px
    xl: "2rem", // 32px
    "2xl": "3rem", // 48px
    "3xl": "4rem", // 64px
  },

  borderRadius: {
    none: "0",
    sm: "0.25rem", // 4px
    md: "0.5rem", // 8px
    lg: "0.75rem", // 12px
    xl: "1rem", // 16px
    full: "9999px", // Circle/pill
  },

  shadows: {
    none: "none",
    xs: "0 1px 2px rgba(0, 0, 0, 0.05)",
    sm: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  },

  breakpoints: {
    xs: "480px",
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },

  zIndices: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modal: 1300,
    popover: 1400,
    toast: 1500,
    tooltip: 1600,
  },

  transitions: {
    default: "0.2s ease",
    fast: "0.1s ease",
    slow: "0.3s ease",
  },
};

export default theme;
