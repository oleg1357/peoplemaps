// Auth persistence + demo-mode (localStorage) auth for the global context.
// Deliberately leaf and dependency-light: it only touches the users seed
// (lib/auth-data), never the heavier demo data layer (lib/store, lib/data), so
// the shared client bundle doesn't ship seed places/reviews to every visitor.

import { INITIAL_USERS, type AuthUser } from "./auth-data";

const USER_ID_KEY = "peoplemaps_user_id";
const USERS_KEY = "peoplemaps_users";

function readUsers(): AuthUser[] {
  if (typeof window === "undefined") return INITIAL_USERS;
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (!raw) return INITIAL_USERS;
    const parsed = JSON.parse(raw) as AuthUser[];
    return Array.isArray(parsed) ? parsed : INITIAL_USERS;
  } catch {
    return INITIAL_USERS;
  }
}

function writeUsers(users: AuthUser[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getLoggedInUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_ID_KEY);
}

export function setLoggedInUser(userId: number | string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_ID_KEY, String(userId));
}

export function clearLoggedInUser(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_ID_KEY);
}

// Resolve a signed-in demo user by id (mirrors the old store.getUser).
export function getUser(userId: string | null): AuthUser | null {
  if (!userId) return null;
  return readUsers().find((u) => u.id === Number(userId)) || null;
}

export function signup(
  firstName: string,
  lastName: string,
  email: string,
  userPassword: string
): { ok: boolean; message: string } {
  const users = readUsers();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, message: "This email is already registered." };
  }
  const nextId = users.reduce((max, u) => Math.max(max, u.id), 0) + 1;
  users.push({ id: nextId, firstName, lastName, email, userPassword });
  writeUsers(users);
  setLoggedInUser(nextId);
  return { ok: true, message: "Account created!" };
}

export function login(
  email: string,
  userPassword: string
): { ok: boolean; message: string; userId?: number } {
  const users = readUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.userPassword !== userPassword) {
    return { ok: false, message: "Invalid email or password." };
  }
  setLoggedInUser(user.id);
  return { ok: true, message: "Logged in", userId: user.id };
}

export type LoginResult = ReturnType<typeof login>;
export type SignupResult = ReturnType<typeof signup>;
