import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const SESSION_COOKIE_NAME = "nirnaya_session";
const SESSION_TTL_DAYS = 7;

export type UserRole = "Policy Analyst" | "Researcher" | "Administrator";

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

/**
 * Securely hashes password using Node.js built-in scrypt with random salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies password against salt:derivedKey using timing-safe comparison.
 */
export function verifyPassword(password: string, combinedHash: string): boolean {
  try {
    const [salt, key] = combinedHash.split(":");
    if (!salt || !key) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(key, "hex");
    return crypto.timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

/**
 * Creates server-side session and sets secure HTTP-only cookie.
 */
export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const createdAt = new Date().toISOString();

  const db = getDb();
  await db.insert(sessions).values({
    id: token,
    userId,
    expiresAt,
    createdAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });

  return token;
}

/**
 * Retrieves the currently authenticated user from session cookie.
 */
export async function getSessionUser(providedToken?: string): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = providedToken || cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const db = getDb();
    const sessionRows = await db.select().from(sessions).where(eq(sessions.id, token)).all();
    if (sessionRows.length === 0) return null;

    const currentSession = sessionRows[0];
    if (new Date(currentSession.expiresAt).getTime() < Date.now()) {
      // Session expired, remove it
      await db.delete(sessions).where(eq(sessions.id, token));
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }

    const userRows = await db.select().from(users).where(eq(users.id, currentSession.userId)).all();
    if (userRows.length === 0) return null;

    const user = userRows[0];
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role as UserRole,
      createdAt: user.createdAt,
    };
  } catch (error) {
    console.error("Error reading session user:", error);
    return null;
  }
}

/**
 * Destroys session in database and clears HTTP-only cookie.
 */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      const db = getDb();
      await db.delete(sessions).where(eq(sessions.id, token));
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch (error) {
    console.error("Error destroying session:", error);
  }
}
