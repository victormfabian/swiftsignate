"use client";

import { useCallback, useEffect, useState } from "react";

type UserSession = {
  role: "user";
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    createdAt: string;
  };
};

type AdminSession = {
  role: "admin";
  admin: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
};

type AuthSession = UserSession | AdminSession | null;

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        cache: "no-store"
      });
      const result = (await response.json()) as {
        ok: boolean;
        session: AuthSession;
      };

      setSession(result.session ?? null);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/signout", {
      method: "POST"
    });

    await refreshSession();
  }, [refreshSession]);

  return {
    session,
    loading,
    refreshSession,
    signOut,
    currentUser: session?.role === "user" ? session.user : null,
    currentAdmin: session?.role === "admin" ? session.admin : null,
    isUserAuthenticated: session?.role === "user",
    isAdminAuthenticated: session?.role === "admin"
  };
}
