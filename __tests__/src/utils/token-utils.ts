const globalWindow = window as any;

export function registerTokenInWindow() {
  const token = localStorage.getItem("token");

  if (token) {
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
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