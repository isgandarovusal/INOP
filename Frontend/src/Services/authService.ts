import {
  getCollection,
  getSession,
  setSession,
  clearSession,
  delay,
} from "./storage";
import type { User, PublicUser } from "../Types/auth";
import { logActivity } from "./activityLogService";

const COLLECTION = "users";

function toPublic(user: User): PublicUser {
  const { password: _password, ...rest } = user;
  return rest;
}

export async function login(email: string, password: string): Promise<PublicUser> {
  await delay(null, 450);
  const users = getCollection<User>(COLLECTION);
  const user = users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
  );
  if (!user) {
    throw new Error("Invalid email or password.");
  }
  if (!user.isActive) {
    throw new Error("This account has been deactivated. Contact an administrator.");
  }
  setSession(user.id);
  logActivity({
    userId: user.id,
    userName: user.name,
    action: "login",
    entityType: "Session",
    entityId: user.id,
    description: `${user.name} logged in`,
  });
  return toPublic(user);
}

export async function logout(): Promise<void> {
  const userId = getSession();
  const users = getCollection<User>(COLLECTION);
  const user = users.find((u) => u.id === userId);
  clearSession();
  if (user) {
    logActivity({
      userId: user.id,
      userName: user.name,
      action: "logout",
      entityType: "Session",
      entityId: user.id,
      description: `${user.name} logged out`,
    });
  }
  await delay(null, 150);
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  await delay(null, 300);
  const userId = getSession();
  if (!userId) return null;
  const users = getCollection<User>(COLLECTION);
  const user = users.find((u) => u.id === userId);
  if (!user || !user.isActive) return null;
  return toPublic(user);
}
