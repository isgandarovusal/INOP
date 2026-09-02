// Generic CRUD helper over a localStorage collection, with activity logging
// baked in. Resource services below wrap this with typed create-input shapes;
// swapping to a real backend later means rewriting this one file's internals
// to call axios instead, not every service.

import { getCollection, setCollection, getSession, delay } from "./storage";
import { logActivity } from "./activityLogService";

interface Actor {
  id: string;
  name: string;
}

function actorInfo(): Actor {
  const userId = getSession();
  if (!userId) return { id: "system", name: "System" };
  const users = getCollection<{ id: string; name: string }>("users");
  const user = users.find((u) => u.id === userId);
  return user ? { id: user.id, name: user.name } : { id: "system", name: "System" };
}

export function makeCrud<T extends { id: string }>(
  collectionName: string,
  entityLabel: string,
  describe: (item: T) => string,
) {
  async function getAll(): Promise<T[]> {
    return delay(getCollection<T>(collectionName));
  }

  async function getById(id: string): Promise<T | undefined> {
    return delay(getCollection<T>(collectionName).find((item) => item.id === id));
  }

  async function create(item: T): Promise<T> {
    const items = getCollection<T>(collectionName);
    items.push(item);
    setCollection(collectionName, items);
    const actor = actorInfo();
    logActivity({
      userId: actor.id,
      userName: actor.name,
      action: "created",
      entityType: entityLabel,
      entityId: item.id,
      description: `${actor.name} created ${entityLabel} "${describe(item)}"`,
    });
    return delay(item);
  }

  async function update(id: string, patch: Partial<T>): Promise<T | undefined> {
    const items = getCollection<T>(collectionName);
    const idx = items.findIndex((item) => item.id === id);
    if (idx === -1) return delay(undefined);
    items[idx] = { ...items[idx], ...patch };
    setCollection(collectionName, items);
    const actor = actorInfo();
    logActivity({
      userId: actor.id,
      userName: actor.name,
      action: "updated",
      entityType: entityLabel,
      entityId: id,
      description: `${actor.name} updated ${entityLabel} "${describe(items[idx])}"`,
    });
    return delay(items[idx]);
  }

  async function remove(id: string): Promise<void> {
    const items = getCollection<T>(collectionName);
    const target = items.find((item) => item.id === id);
    const remaining = items.filter((item) => item.id !== id);
    setCollection(collectionName, remaining);
    if (target) {
      const actor = actorInfo();
      logActivity({
        userId: actor.id,
        userName: actor.name,
        action: "deleted",
        entityType: entityLabel,
        entityId: id,
        description: `${actor.name} deleted ${entityLabel} "${describe(target)}"`,
      });
    }
    return delay(undefined);
  }

  return { getAll, getById, create, update, remove };
}
