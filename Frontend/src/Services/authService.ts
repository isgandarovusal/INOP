import api from "../api/axios";
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
  clearAuthToken();
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const token = getAuthToken();

  if (!token) {
    return null;
  }

  try {
    const response = await api.get<MeResponse>("/auth/me");
    return response.data.user;
  } catch (error: unknown) {
    if (isAxiosError(error) && error.response?.status === 401) {
      clearAuthToken();
    }

    return null;
  }
}
