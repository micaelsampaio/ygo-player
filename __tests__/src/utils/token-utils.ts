const globalWindow = window as any;

/**
 * Generates a fake token for local development
 */
function generateFakeToken() {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      name: "Test User",
      sub: "123456789",
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours from now
      iat: Math.floor(Date.now() / 1000),
    })
  );
  const signature = btoa("fake-signature");

  return `${header}.${payload}.${signature}`;
}

export function registerTokenInWindow() {
  const token = localStorage.getItem("token");

  if (token) {
    try {
      const tokenData = JSON.parse(atob(token.split(".")[1]));
      globalWindow.ygo101_token = token;
      globalWindow.ygo101_token_data = tokenData;
    } catch (error) {
      globalWindow.ygo101_token = token;
      globalWindow.ygo101_token_data = null;
    }
  } else {
    globalWindow.ygo101_token = null;
    globalWindow.ygo101_token_data = null;
  }
}

export function isUserLoggedIn() {
  return !!getUserToken();
}

export function getUserToken(): string | null {
  return globalWindow.ygo101_token ?? null;
}

export function getUserTokenData(): any | null {
  return globalWindow.ygo101_token_data ?? null;
}

// For development environments, simulate login when login button is clicked
export function simulateLogin() {
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    const token = generateFakeToken();
    localStorage.setItem("token", token);
    registerTokenInWindow();
    console.log("Login simulated for development environment");

    // Reload page to reflect changes in UI
    window.location.reload();
    return true;
  }
  return false;
}
