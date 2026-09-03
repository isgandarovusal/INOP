// Mock persistence layer — a localStorage-backed collection store standing in
// for the not-yet-built backend. Service modules use this so their internals
// (not their call signatures) are the only thing that changes once a real
// API exists.

const PREFIX = "inop_";
const SEED_FLAG = `${PREFIX}seeded`;

export function getCollection<T>(name: string): T[] {
  const raw = localStorage.getItem(PREFIX + name);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

export function setCollection<T>(name: string, items: T[]): void {
  localStorage.setItem(PREFIX + name, JSON.stringify(items));
}

export function isSeeded(): boolean {
  return localStorage.getItem(SEED_FLAG) === "true";
}

export function markSeeded(): void {
  localStorage.setItem(SEED_FLAG, "true");
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function getSession(): string | null {
  return localStorage.getItem(`${PREFIX}session`);
}

export function setSession(userId: string): void {
  localStorage.setItem(`${PREFIX}session`, userId);
}

export function clearSession(): void {
  localStorage.removeItem(`${PREFIX}session`);
}
