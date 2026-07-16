import { useCallback, useSyncExternalStore } from "react";

import {
  clearAccessToken,
  getAccessToken,
  getSessionInitialized,
  setAccessToken,
  subscribeToAuth,
} from "../lib/auth";

export function useAuthToken() {
  const token = useSyncExternalStore(subscribeToAuth, getAccessToken, () => null);
  const isReady = useSyncExternalStore(subscribeToAuth, getSessionInitialized, () => false);

  const saveToken = useCallback((nextToken: string) => {
    setAccessToken(nextToken);
  }, []);

  const removeToken = useCallback(() => {
    clearAccessToken();
  }, []);

  return {
    token,
    isAuthenticated: Boolean(token),
    isReady,
    setToken: saveToken,
    clearToken: removeToken,
  };
}
