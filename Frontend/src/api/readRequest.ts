import { CanceledError } from "axios";
import api from "./axios";
import { aggregateEpoch, takeAggregate, keepAggregate } from "./aggregateCache";

type Consumer = { resolve: (value: unknown) => void; reject: (error: unknown) => void; detach: () => void };
type Pending = { controller: AbortController; consumers: Set<Consumer>; cancelTimer?: ReturnType<typeof setTimeout> };
const pending = new Map<string, Pending>();

// Only pending reads with an explicit permission fingerprint are shared.
// Default settled reads remain uncached. Only explicit numeric dashboard reads
// can use the bounded allowlisted memory cache; never auth/PII/CV documents.
export function readJson<T>(url: string, options: { signal?: AbortSignal; scopeKey?: string; suppressErrorToast?:boolean; aggregateScopeKey?:string } = {}): Promise<T> {
  const { signal, scopeKey, suppressErrorToast, aggregateScopeKey } = options;
  const epoch = aggregateEpoch(), server = String(api.defaults.baseURL || ''), cacheScope = scopeKey ? aggregateScopeKey : undefined;
  const token = localStorage.getItem("inop_auth_token");
  const headers = { Authorization: token ? `Bearer ${token}` : "" };
  if (signal?.aborted) return Promise.reject(new CanceledError());
  const cached = takeAggregate(url,cacheScope,server);
  if (cached !== undefined) return Promise.resolve(cached as T);
  if (!scopeKey) return api.get<T>(url, { signal, headers, suppressErrorToast }).then(response => response.data);
  const key = JSON.stringify([token, scopeKey, url,!!suppressErrorToast,server,cacheScope,cacheScope ? epoch : null]);
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
    void api.get<T>(url, { signal: request.controller.signal, headers, suppressErrorToast }).then(
      response => { keepAggregate(url,cacheScope,token,epoch,response.data,server); settle(true, response.data); }, error => settle(false, error),
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
