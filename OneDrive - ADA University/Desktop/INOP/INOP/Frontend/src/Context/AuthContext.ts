import { createContext } from "react";
import type { PublicUser } from "../Types/auth";

export interface AuthContextValue {
  user: PublicUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export { AuthProvider } from "./AuthContextProvider";
export { useAuth } from "./useAuth";
