import { getCollection, setCollection, generateId, delay } from "./storage";
import type { ActivityLogEntry } from "../Types/core";

const COLLECTION = "activityLogs";

export async function getActivityLogs(): Promise<ActivityLogEntry[]> {
  const items = getCollection<ActivityLogEntry>(COLLECTION);
  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return delay(sorted);
}

export function logActivity(params: {
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
}): void {
  const items = getCollection<ActivityLogEntry>(COLLECTION);
  items.push({
    id: generateId("log"),
    createdAt: new Date().toISOString(),
    ...params,
  });
  setCollection(COLLECTION, items);
}
