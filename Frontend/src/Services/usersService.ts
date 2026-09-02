import { getCollection, setCollection, generateId, getSession, delay } from "./storage";
import type { User, PublicUser, Role } from "../Types/auth";
import { logActivity } from "./activityLogService";

const COLLECTION = "users";

function toPublic(user: User): PublicUser {
  const { password: _password, ...rest } = user;
  return rest;
}

function actingUser(): { id: string; name: string } {
  const id = getSession();
  const user = getCollection<User>(COLLECTION).find((u) => u.id === id);
  return user ? { id: user.id, name: user.name } : { id: "system", name: "System" };
}

export async function getUsers(): Promise<PublicUser[]> {
  return delay(getCollection<User>(COLLECTION).map(toPublic));
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  departmentId: string;
  position: string;
}

export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  const users = getCollection<User>(COLLECTION);
  if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error("A user with this email already exists.");
  }
  const user: User = {
    id: generateId("usr"),
    isActive: true,
    createdAt: new Date().toISOString(),
    ...input,
  };
  users.push(user);
  setCollection(COLLECTION, users);
  const actor = actingUser();
  logActivity({
    userId: actor.id,
    userName: actor.name,
    action: "created",
    entityType: "User",
    entityId: user.id,
    description: `${actor.name} created User "${user.name}"`,
  });
  return delay(toPublic(user));
}

export type UpdateUserInput = Partial<Omit<CreateUserInput, "password">> & { password?: string };

export async function updateUser(id: string, patch: UpdateUserInput): Promise<PublicUser | undefined> {
  const users = getCollection<User>(COLLECTION);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return delay(undefined);
  users[idx] = { ...users[idx], ...patch };
  setCollection(COLLECTION, users);
  const actor = actingUser();
  logActivity({
    userId: actor.id,
    userName: actor.name,
    action: "updated",
    entityType: "User",
    entityId: id,
    description: `${actor.name} updated User "${users[idx].name}"`,
  });
  return delay(toPublic(users[idx]));
}

export async function setUserActive(id: string, isActive: boolean): Promise<PublicUser | undefined> {
  const users = getCollection<User>(COLLECTION);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return delay(undefined);
  users[idx] = { ...users[idx], isActive };
  setCollection(COLLECTION, users);
  const actor = actingUser();
  logActivity({
    userId: actor.id,
    userName: actor.name,
    action: isActive ? "activated" : "deactivated",
    entityType: "User",
    entityId: id,
    description: `${actor.name} ${isActive ? "activated" : "deactivated"} User "${users[idx].name}"`,
  });
  return delay(toPublic(users[idx]));
}
