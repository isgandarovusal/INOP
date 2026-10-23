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
  // Anonymous navigation has no session to hydrate and must not wait for API
  // availability (including a cold backend) before showing the login form.
  const [isLoading, setIsLoading] = useState(() => Boolean(getAuthToken()));
  const requestRevision = useRef(0);

  useEffect(() => {
    let mounted = true;
    const controllers = new Set<AbortController>();
    let lastRefresh: { source: string; token: string | null; started: number; pending: boolean } | undefined;

    const handleAuthExpired = () => {
      requestRevision.current += 1;
      if (mounted) {
        setUser(null);
        setIsLoading(false);
      }
    };

    window.addEventListener("inop:auth-expired", handleAuthExpired);

    const refresh = async (initial = false, source = "initial") => {
      const token = getAuthToken();
      // Focus and visibility often describe the same return to a tab. Share
      // only that pending event pair: a completed read, changed token or a
      // subsequent same-source event must still recheck server permissions.
      if (lastRefresh?.pending && lastRefresh.source !== "initial" && source !== lastRefresh.source &&
          lastRefresh.token === token && performance.now() - lastRefresh.started < 250) return;
      for (const controller of controllers) controller.abort();
      const revision = ++requestRevision.current;
      const refreshState = { source, token, started: performance.now(), pending: true };
      lastRefresh = refreshState;
      const controller = new AbortController();
      controllers.add(controller);
      const currentUser = await getCurrentUser(controller.signal, JSON.stringify(["session", initial ? "initial" : revision]));
      controllers.delete(controller);
      refreshState.pending = false;
      if (!mounted || revision !== requestRevision.current || token !== getAuthToken()) return;
      // A transient /me failure must not sign out a still-authenticated user.
      if (currentUser || !getAuthToken()) {
        setUser(previous => JSON.stringify(previous) === JSON.stringify(currentUser) ? previous : currentUser);
      }
      setIsLoading(false);
    };
    const onFocus = () => { if (document.visibilityState === "visible") void refresh(false, "focus"); };
    const visible = () => { if (document.visibilityState === "visible") void refresh(false, "visibility"); };
    void refresh(true);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", visible);

    return () => {
      mounted = false;
      for (const controller of controllers) controller.abort();
      requestRevision.current += 1;
      window.removeEventListener("focus", onFocus);
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
