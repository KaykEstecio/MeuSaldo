import { clearAccessToken, getAccessToken, setAccessToken } from "../lib/auth";
import type { ApiResponse, TokenResponse } from "../types/api";
import type { ApiErrorBody } from "../types/api";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "/api/v1" : "http://localhost:8000/api/v1");
const requestTimeoutMs = 8_000;

type RequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  headers?: HeadersInit;
  withAuth?: boolean;
};

export class ApiError extends Error {
  status: number;
  code: string;
  details: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetchWithTimeout(`${apiBaseUrl}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          clearAccessToken();
          return null;
        }
        const payload = (await response.json()) as ApiResponse<TokenResponse>;
        setAccessToken(payload.data.access_token);
        return payload.data.access_token;
      })
      .catch(() => {
        clearAccessToken();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function initializeSession(): Promise<void> {
  await refreshAccessToken();
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const payload = (await response.json()) as ApiErrorBody;
    return new ApiError(response.status, payload.error.code, payload.error.message, payload.error.details);
  } catch {
    return new ApiError(response.status, "INTERNAL_ERROR", "Erro ao comunicar com a API");
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return requestWithSession<T>(path, options, true);
}

async function requestWithSession<T>(path: string, options: RequestOptions, allowRefresh: boolean): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.withAuth !== false) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetchWithTimeout(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401 && options.withAuth !== false && allowRefresh) {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        return requestWithSession<T>(path, options, false);
      }
    }
    throw await parseError(response);
  }

  return (await response.json()) as T;
}
