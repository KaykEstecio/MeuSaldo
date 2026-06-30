import { apiRequest } from "./client";
import type { ApiResponse, TokenResponse, User } from "../types/api";

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export function login(payload: LoginPayload) {
  return apiRequest<ApiResponse<TokenResponse>>("/auth/login", {
    method: "POST",
    body: payload,
    withAuth: false,
  });
}

export function register(payload: RegisterPayload) {
  return apiRequest<ApiResponse<User>>("/auth/register", {
    method: "POST",
    body: payload,
    withAuth: false,
  });
}

export function getCurrentUser() {
  return apiRequest<ApiResponse<User>>("/users/me");
}
