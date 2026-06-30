import { useCallback, useSyncExternalStore } from "react";

import { clearAccessToken, getAccessToken, setAccessToken } from "../lib/auth";

const authEventName = "meusaldo-auth-token-change";

function emitAuthChange() {
  window.dispatchEvent(new Event(authEventName));
}

function subscribe(callback: () => void) {
  window.addEventListener(authEventName, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(authEventName, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useAuthToken() {
  const token = useSyncExternalStore(subscribe, getAccessToken, () => null);

  const saveToken = useCallback((nextToken: string) => {
    setAccessToken(nextToken);
    emitAuthChange();
  }, []);

  const removeToken = useCallback(() => {
    clearAccessToken();
    emitAuthChange();
  }, []);

  return {
    token,
    isAuthenticated: Boolean(token),
    setToken: saveToken,
    clearToken: removeToken,
  };
}
