import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { login as loginRequest, logout as logoutRequest } from "../api/auth";
import { onSessionExpired, REFRESH_TOKEN_STORAGE_KEY, SESSION_STORAGE_KEY, TOKEN_STORAGE_KEY } from "../api/client";
import type { LoginRequest, Session } from "../types/auth";

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  signIn: (request: LoginRequest) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
      if (stored) {
        setSession(JSON.parse(stored) as Session);
      }
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => onSessionExpired(() => void clearSession()), []);

  async function clearSession() {
    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_STORAGE_KEY);
    await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
    setSession(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      async signIn(request) {
        const auth = await loginRequest(request);
        const nextSession: Session = {
          employeeId: auth.employeeId,
          fullName: auth.fullName,
          role: auth.role,
          expiresAtUtc: auth.expiresAtUtc,
        };
        await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, auth.accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_STORAGE_KEY, auth.refreshToken);
        await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
        setSession(nextSession);
      },
      async signOut() {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_STORAGE_KEY);
        if (refreshToken) {
          try {
            await logoutRequest(refreshToken);
          } catch {
            // Best-effort server-side revocation; local sign-out proceeds regardless.
          }
        }
        await clearSession();
      },
    }),
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
