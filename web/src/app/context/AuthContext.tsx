"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { EnterpriseVerificationStatus, Role, SubscriptionTier } from "@/lib/types";
import { apiFetch, resetCsrfToken } from "@/lib/api-fetch";

/**
 * Mirrors SessionUser from the server (userId, role, name) plus optional
 * display-only fields populated from /api/v1/me/profile once logged in.
 */
export type AuthUser = {
  id: string;       // maps from SessionUser.userId
  name: string;
  role: Role;
  enterpriseStatus?: EnterpriseVerificationStatus;
  subscriptionTier?: SubscriptionTier;
  email?: string;
  avatarUrl?: string;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  refresh: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  refresh: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      // Response shape: { data: { session: SessionUser | null }, meta: {...} }
      const res = await fetch("/api/v1/auth/session", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const json = await res.json();
      const session = json?.data?.session;
      if (session && session.userId) {
        setUser({
          id:        session.userId,
          name:      session.name,
          role:      session.role,
          enterpriseStatus: session.enterpriseStatus,
          subscriptionTier: session.subscriptionTier,
          email:     session.email,
          avatarUrl: session.avatarUrl,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = () => {
    const current = typeof window !== "undefined" ? window.location.pathname : "/";
    window.location.href = `/api/v1/auth/github?redirect=${encodeURIComponent(current)}`;
  };

  const logout = async () => {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    resetCsrfToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh: loadSession }}>
      {children}
    </AuthContext.Provider>
  );
}
