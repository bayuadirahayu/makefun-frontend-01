// make.fun public API, read-only GETs, open to any origin (CORS).
// Every answer is cached and revalidated: a conditional request carries the
// ETag the API sent, and a 304 within the minute reuses the cached body,
// so revisiting a view costs one cheap round trip instead of a full fetch.

const API = 'https://make.fun/api';

// path -> { etag, body, at } ; the API binds ETags to the minute, so a
// revalidation is cheap and a 304 means the data is still current.
const cache = new Map();

export function cacheSize() {
  return cache.size;
}

export async function getJson(path) {
  const hit = cache.get(path);
  const headers = {};
  if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
  const res = await fetch(API + path, { headers });
  if (res.status === 304 && hit) return hit.body;
  if (!res.ok) {
    const err = new Error(`make.fun API ${res.status} for ${path}`);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  const etag = res.headers.get('ETag');
  cache.set(path, { etag, body, at: Date.now() });
  return body;
}

/** The live bounty board. activity=times leaves out per-bounty activity a board never shows. */
export const getBounties = () => getJson('/competitions?status=open&activity=times&limit=100');

/** One bounty, by slug: summary, description, rules, rewards, dates, pot, fee. */
export const getBounty = (slug) => getJson(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard: columns describe the score columns, entries the rows. */
export const getLeaderboard = (slug) => getJson(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** An account's public profile, by handle. */
export const getProfile = (handle) => getJson(`/profiles/${encodeURIComponent(handle)}`);

/** Absolute URL for an API-relative asset path (avatars live under /api). */
export function apiUrl(path) {
  if (!path) return '';
  return path.startsWith('http') ? path : API + path;
}
