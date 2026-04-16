"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

/**
 * P2-UX-5: Notification state separated from AuthContext.
 *
 * Splitting unreadCount + SSE into its own context prevents the entire
 * auth consumer tree from re-rendering on every notification count change.
 * Components that only need user/role/login/logout import useAuth().
 * Components that also need unreadCount import useNotifications().
 */

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
      _notificationSse?.close();
      _notificationSse = null;
    };
  } catch {
    _notificationSse = null;
  }
}

export function closeNotificationSse() {
  _notificationSse?.close();
  _notificationSse = null;
}

type NotificationContextType = {
  unreadCount: number;
  setUnreadCount: (n: number) => void;
};

export const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  setUnreadCount: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  /** When userId is non-null the SSE stream is started. */
  userId: string | null;
}) {
  const [unreadCount, setUnreadCountState] = useState(0);

  const setUnreadCount = useCallback((n: number) => {
    setUnreadCountState(Math.max(0, Math.floor(n)));
  }, []);

  useEffect(() => {
    if (!userId) {
      setUnreadCountState(0);
      return;
    }
    startNotificationSse(setUnreadCount);
  }, [userId, setUnreadCount]);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}
