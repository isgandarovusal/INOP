import api from "../api/axios";
import { readJson } from "../api/readRequest";
import { isAxiosError } from "axios";
import type { PublicUser } from "../Types/auth";

const TOKEN_KEY = "inop_auth_token";

interface LoginResponse {
  message: string;
  token: string;
  user: PublicUser;
}

interface MeResponse {
  user: PublicUser;
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(
  email: string,
  password: string,
): Promise<PublicUser> {
  const response = await api.post<LoginResponse>("/auth/login", {
    email: email.trim(),
    password,
  });

  setAuthToken(response.data.token);

  return response.data.user;
}

export async function logout(): Promise<void> {
  const token = getAuthToken();

  if (!token) {
    return;
  }

  try {
    await api.post("/auth/logout");
  } finally {
    clearAuthToken();
  }
}

export async function getCurrentUser(signal?: AbortSignal, scopeKey?: string): Promise<PublicUser | null> {
  const token = getAuthToken();

  if (!token) {
    return null;
  }

  try {
    const response = await readJson<MeResponse>("/auth/me", { signal, scopeKey });
    return response.user;
  } catch (error: unknown) {
    // /me403 is a rejected session (for example an inactive account), not a
    // resource-level permission denial. Transient failures keep the session;
    // an old request must never expire a newly signed-in token.
    if (isAxiosError(error) && [401, 403].includes(error.response?.status || 0) && getAuthToken() === token) {
      clearAuthToken();
      window.dispatchEvent(new CustomEvent("inop:auth-expired"));
    }

    return null;
  }
}
