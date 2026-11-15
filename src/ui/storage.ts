import type { GameState, Planet } from '../engine';
import type { Lang } from '../i18n';

/** Local save (always) — the cloud layer in cloud.ts syncs this same blob when logged in. */
export interface Settings {
  lang: Lang;
  muted: boolean;
  tutorialDone: boolean;
}

export interface SaveBlob {
  version: 1;
  updatedAt: number;
  settings: Settings;
  mission: GameState | null;
  best: Record<Planet, number>;
}

const KEY = 'regolith-rising-save-v1';

export function defaultSave(): SaveBlob {
  const lang: Lang = typeof navigator !== 'undefined' && navigator.language?.startsWith('ar') ? 'ar' : 'en';
  return { version: 1, updatedAt: 0, settings: { lang, muted: false, tutorialDone: false }, mission: null, best: { moon: 0, mars: 0 } };
}

export function loadLocal(): SaveBlob {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as SaveBlob;
    if (parsed.version !== 1) return defaultSave();
    return { ...defaultSave(), ...parsed, settings: { ...defaultSave().settings, ...parsed.settings } };
  } catch {
    return defaultSave();
  }
}

export function saveLocal(blob: SaveBlob): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(blob));
  } catch {
    /* storage full or blocked: the game keeps running in memory */
  }
}
