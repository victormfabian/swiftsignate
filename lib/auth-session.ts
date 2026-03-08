import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { createSession, deleteSession, getDefaultAdminEmail, getSessionByToken } from "@/lib/auth-db";

export const SESSION_COOKIE_NAME = "swift_signate_session";

export type UserSession = {
  role: "user";
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    createdAt: string;
  };
};

export type AdminSession = {
  role: "admin";
  admin: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
};

export type AuthSession = UserSession | AdminSession | null;

export async function getAuthSession(): Promise<AuthSession> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await getSessionByToken(token);
  if (!session) {
    return null;
  }

  if (session.role === "user") {
    return {
      role: "user",
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        phone: session.user.phone,
        createdAt: session.user.created_at
      }
    };
  }

  return {
    role: "admin",
    admin: {
      id: session.admin.id,
      name: session.admin.name,
      email: session.admin.email,
      createdAt: session.admin.created_at
    }
  };
}

export function setSessionCookie(response: NextResponse, session: { token: string; expiresAt: number }) {
  response.cookies.set(SESSION_COOKIE_NAME, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(session.expiresAt)
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0)
  });
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await deleteSession(token);
  }
}

export async function issueUserSession(userId: string) {
  return createSession("user", userId);
}

export async function issueAdminSession(adminId: string) {
  return createSession("admin", adminId);
}

export function getSeedAdminEmail() {
  return getDefaultAdminEmail();
}
