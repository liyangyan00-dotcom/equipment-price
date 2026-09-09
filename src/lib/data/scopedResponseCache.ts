type Entry = { expiresAt: number; response?: Response; pending?: Promise<Response> };
const entries = new Map<string, Entry>();
type ReadScope = { organizationId: string; userId: string; role: string };
const cacheKey = (scope: ReadScope, resource: string) => JSON.stringify([scope.organizationId, scope.userId, scope.role, resource]);

export function invalidateScopedRead(scope: ReadScope, resource: string) {
  entries.delete(cacheKey(scope, resource));
}

// Call AFTER fresh authentication/authorization. Never cache errors or cookies.
export async function scopedReadResponse(
  scope: ReadScope,
  resource: string,
  load: () => Promise<Response>,
  ttlMs = 30_000,
) {
  const key = cacheKey(scope, resource);
  const existing = entries.get(key);
  if (existing?.pending) return (await existing.pending).clone();
  if (existing?.response && existing.expiresAt > Date.now()) return existing.response.clone();
  entries.delete(key);
  if (entries.size >= 128) entries.delete(entries.keys().next().value!);
  const entry: Entry = { expiresAt: 0 };
  entries.set(key, entry);
  const remove = () => { if (entries.get(key) === entry) entries.delete(key); };
  const pending = Promise.resolve().then(load).then((response) => {
    if (response.ok && !response.headers.has("set-cookie")) {
      entry.response = response.clone();
      entry.expiresAt = Date.now() + ttlMs;
    } else remove();
    return response;
  }).catch((error) => { remove(); throw error; })
    .finally(() => { entry.pending = undefined; });
  entry.pending = pending;
  return (await pending).clone();
}
