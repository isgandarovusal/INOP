import { CanceledError } from "axios";
import api from "./axios";

type Consumer = { resolve: (value: unknown) => void; reject: (error: unknown) => void; detach: () => void };
type Pending = { controller: AbortController; consumers: Set<Consumer>; cancelTimer?: ReturnType<typeof setTimeout> };
const pending = new Map<string, Pending>();

// Only pending reads with an explicit permission fingerprint are shared.
// Settled responses are never cached: refresh always rechecks the server.
export function readJson<T>(url: string, options: { signal?: AbortSignal; scopeKey?: string } = {}): Promise<T> {
  const { signal, scopeKey } = options;
  const token = localStorage.getItem("inop_auth_token");
  const headers = { Authorization: token ? `Bearer ${token}` : "" };
  if (signal?.aborted) return Promise.reject(new CanceledError());
  if (!scopeKey) return api.get<T>(url, { signal, headers }).then(response => response.data);
  const key = JSON.stringify([token, scopeKey, url]);
  let entry = pending.get(key);
  if (!entry || entry.controller.signal.aborted) {
    entry = { controller: new AbortController(), consumers: new Set() };
    pending.set(key, entry);
    const request = entry;
    const settle = (success: boolean, value: unknown) => {
      if (pending.get(key) === request) pending.delete(key);
      clearTimeout(request.cancelTimer);
      for (const consumer of request.consumers) {
        consumer.detach();
        if (success) consumer.resolve(value); else consumer.reject(value);
      }
      request.consumers.clear();
    };
    void api.get<T>(url, { signal: request.controller.signal, headers }).then(
      response => settle(true, response.data), error => settle(false, error),
    );
  }
  const request = entry;
  clearTimeout(request.cancelTimer);
  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      request.consumers.delete(consumer); consumer.detach();
      reject(new CanceledError());
      // StrictMode can resubscribe in the same turn without a second request.
      if (!request.consumers.size) request.cancelTimer = setTimeout(() => {
        if (!request.consumers.size) request.controller.abort();
      }, 0);
    };
    const consumer: Consumer = { resolve: value => resolve(value as T), reject, detach: () => signal?.removeEventListener("abort", abort) };
    request.consumers.add(consumer);
    signal?.addEventListener("abort", abort, { once: true });
  });
}
