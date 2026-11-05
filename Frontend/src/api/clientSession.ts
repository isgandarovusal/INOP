import type { PublicUser } from '../Types/auth';
let identity = '';
const resets = new Set<() => void>();
export function onClientSessionReset(clear: () => void) { resets.add(clear); }
export function clearClientSession() { identity = ''; for (const clear of resets) clear(); }
export function syncClientSession(user: PublicUser | null) {
  const next = JSON.stringify([localStorage.getItem('inop_auth_token'),user?.id,user?.role,user?.departmentId,user?.isActive,user?.hrAccess,user?.auditDirection,user?.auditDirections,user?.permissions]);
  if (identity !== next) { clearClientSession(); identity = next; }
  return identity;
}
const navigation = new Map<string, unknown>();
onClientSessionReset(() => navigation.clear());
export function readNavigation<T>(key: string | undefined, fallback: T): T { return key && navigation.has(key) ? structuredClone(navigation.get(key)) as T : fallback; }
export function writeNavigation(key: string | undefined, value: unknown, owner: string) {
  if (!key || owner !== identity) return;
  // Preferences only, never records/drafts. Memory only; no URL or storage writes.
  if (JSON.stringify(value)?.length > 8192) { navigation.delete(key); return; }
  if (navigation.size >= 64 && !navigation.has(key)) navigation.delete(navigation.keys().next().value!);
  navigation.set(key, structuredClone(value));
}
