let accessToken: string | null = null;
let sessionInitialized = false;
const listeners = new Set<() => void>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
  listeners.forEach((listener) => listener());
}

export function clearAccessToken(): void {
  accessToken = null;
  listeners.forEach((listener) => listener());
}

export function subscribeToAuth(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function getSessionInitialized(): boolean {
  return sessionInitialized;
}

export function markSessionInitialized(): void {
  sessionInitialized = true;
  listeners.forEach((listener) => listener());
}

export function isAuthenticated(): boolean {
  return Boolean(accessToken);
}
