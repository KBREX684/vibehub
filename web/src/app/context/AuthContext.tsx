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

let _lastSseInitAt = 0;
let _notificationSse: EventSource | null = null;
const SSE_RECONNECT_GAP_MS = 15_000;

function startNotificationSse(onUnread: (n: number) => void) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (_notificationSse && now - _lastSseInitAt < SSE_RECONNECT_GAP_MS) return;
  _lastSseInitAt = now;

  try {
    _notificationSse?.close();
    _notificationSse = new EventSource("/api/v1/me/notifications?stream=1");
    _notificationSse.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data) as { data?: { unreadCount?: unknown } };
        const unreadRaw = payload?.data?.unreadCount;
        if (typeof unreadRaw === "number" && Number.isFinite(unreadRaw)) {
          onUnread(unreadRaw);
        }
      } catch {
        // ignore malformed SSE event payload
      }
    };
    _notificationSse.onerror = () => {
      // Let browser reconnect automatically; close stale handle.
      _notificationSse?.close();
      _notificationSse = null;
    };
  } catch {
    _notificationSse = null;
  }
}

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  unreadCount: number;
  login: () => void;
  logout: () => void;
  refresh: () => Promise<void>;
  setUnreadCount: (n: number) => void;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  unreadCount: 0,
  login: () => {},
  logout: () => {},
  refresh: async () => {},
  setUnreadCount: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCountState] = useState(0);

  const setUnreadCount = useCallback((n: number) => {
    setUnreadCountState(Math.max(0, Math.floor(n)));
  }, []);

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
      await apiFetch("/api/v1/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
    } catch {
      // ignore
    }
    resetCsrfToken();
    _notificationSse?.close();
    _notificationSse = null;
    setUnreadCountState(0);
    setUser(null);
  };

  useEffect(() => {
    if (!user) return;
    startNotificationSse(setUnreadCount);
  }, [user, setUnreadCount]);

  return (
    <AuthContext.Provider value={{ user, loading, unreadCount, login, logout, refresh: loadSession, setUnreadCount }}>
      {children}
    </AuthContext.Provider>
  );
}
