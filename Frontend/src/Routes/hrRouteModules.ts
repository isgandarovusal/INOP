import type { PublicUser } from '../Types/auth';
import { hasPermission } from '../Utils/permissions';

const pages = {
  analytics: { resource: 'application', file: 'Analytics/HRAnalytics' },
  applications: { resource: 'application', file: 'Applications/ApplicationsList' },
  jobs: { resource: 'recruitment', file: 'Jobs/JobsList' },
  candidates: { resource: 'candidate', file: 'Candidates/CandidatesList' },
};
type Manifest = Record<string, { file: string }>;
let manifest: Promise<Manifest> | undefined;
const pending = new Map<string, Promise<void>>();
async function publicFetch(url: string) {
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { credentials: 'omit', cache: 'force-cache', signal: controller.signal });
    if (!response.ok) throw new Error('Public route code unavailable');
    return await response.text();
  } finally { clearTimeout(deadline); }
}
// HTTP-cache public code, never import/evaluate it speculatively. A failed
// import() is cached in the browser module map and can poison later navigation.
// Hashed code assets contain no private responses, token or scope state.
export function preloadHRRoute(path: string, user: PublicUser | null) {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType || '')) return;
  const name = path.split('?')[0].replace('/app/recruitment/', '');
  if (!(name in pages)) return;
  const target = pages[name as keyof typeof pages];
  if (!hasPermission(user, target.resource, 'read') || pending.has(name)) return;
  const task = (async () => {
    const source = `src/Pages/Recruitment/${target.file}.tsx`;
    let url = '/' + source;
    if (import.meta.env.PROD) {
      manifest ??= publicFetch(import.meta.env.BASE_URL + 'hr-route-manifest.json').then(text => JSON.parse(text) as Manifest).catch(error => { manifest = undefined; throw error; });
      const file = (await manifest)[source]?.file;
      if (!file || !/^assets\/[a-zA-Z0-9_.-]+\.js$/.test(file)) return;
      url = import.meta.env.BASE_URL + file;
    }
    await publicFetch(url);
  })().catch(() => { /* Navigation performs its own authoritative code/data load. */ })
    .finally(() => pending.delete(name));
  pending.set(name, task);
}
