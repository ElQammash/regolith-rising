/**
 * Optional cloud save. The game is offline-first: localStorage is always the
 * source of truth on the device. When the player is logged in, the same save
 * blob is pushed to a tiny PHP API on the same host (see /api in the repo).
 * Any network error is swallowed: the game never blocks on the cloud.
 */
import type { SaveBlob } from './storage';

const API = './api/';
const TOKEN_KEY = 'regolith-rising-token';
const USER_KEY = 'regolith-rising-user';

export interface CloudUser {
  username: string;
}

function token(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function currentUser(): CloudUser | null {
  try {
    const u = localStorage.getItem(USER_KEY);
    return u && token() ? { username: u } : null;
  } catch {
    return null;
  }
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const t = token();
  const res = await fetch(API + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export async function register(username: string, password: string): Promise<CloudUser> {
  const r = await call<{ token: string; username: string }>('register.php', { username, password });
  localStorage.setItem(TOKEN_KEY, r.token);
  localStorage.setItem(USER_KEY, r.username);
  return { username: r.username };
}

export async function login(username: string, password: string): Promise<CloudUser> {
  const r = await call<{ token: string; username: string }>('login.php', { username, password });
  localStorage.setItem(TOKEN_KEY, r.token);
  localStorage.setItem(USER_KEY, r.username);
  return { username: r.username };
}

export function logout(): void {
  const t = token();
  if (t) void call('logout.php', {}).catch(() => undefined);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function fetchSave(): Promise<SaveBlob | null> {
  const r = await call<{ save: SaveBlob | null }>('save.php');
  return r.save;
}

let pending: ReturnType<typeof setTimeout> | null = null;

/** Debounced push; silently does nothing when logged out or offline. */
export function pushSave(blob: SaveBlob): Promise<void> {
  if (!currentUser()) return Promise.resolve();
  if (pending) clearTimeout(pending);
  return new Promise((resolve) => {
    pending = setTimeout(() => {
      call('save.php', { save: blob })
        .catch(() => undefined)
        .finally(() => resolve());
    }, 800);
  });
}
