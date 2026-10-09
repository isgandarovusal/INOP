import {
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import type { PublicUser } from "../Types/auth";
import {
  login as loginRequest,
  logout as logoutRequest,
  getCurrentUser,
  getAuthToken,
} from "../Services/authService";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestRevision = useRef(0);

  useEffect(() => {
    let mounted = true;

    const handleAuthExpired = () => {
      requestRevision.current += 1;
      if (mounted) {
        setUser(null);
        setIsLoading(false);
      }
    };

    window.addEventListener("inop:auth-expired", handleAuthExpired);

    const refresh = async () => {
      const revision = ++requestRevision.current;
      const token = getAuthToken();
      const currentUser = await getCurrentUser();
      if (!mounted || revision !== requestRevision.current || token !== getAuthToken()) return;
      // A transient /me failure must not sign out a still-authenticated user.
      if (currentUser || !getAuthToken()) {
        setUser(previous => JSON.stringify(previous) === JSON.stringify(currentUser) ? previous : currentUser);
      }
      setIsLoading(false);
    };
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    void refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);

    return () => {
      mounted = false;
      requestRevision.current += 1;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener(
        "inop:auth-expired",
        handleAuthExpired,
      );
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    requestRevision.current += 1;
    const loggedInUser = await loginRequest(email, password);
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(async () => {
    requestRevision.current += 1;
    await logoutRequest();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading, login, logout]);
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
