import { describe, expect, it } from 'vitest';
import ar from './ar';
import en from './en';
import { translate } from './index';

function keys(o: unknown, prefix = ''): string[] {
  if (typeof o !== 'object' || o === null) return [prefix];
  return Object.entries(o).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe('translations', () => {
  it('Arabic has every English key, and no empty strings', () => {
    const enKeys = keys(en).sort();
    expect(keys(ar).sort()).toEqual(enKeys);
    for (const k of keys(ar)) expect(translate('ar', k).trim().length, k).toBeGreaterThan(0);
  });
  it('keeps the same {placeholders} in both languages', () => {
    for (const k of keys(en)) {
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
      const lookup = (o: unknown) => k.split('.').reduce((a: unknown, p) => (a as Record<string, unknown>)[p], o) as string;
      expect(ph(lookup(ar)), k).toBe(ph(lookup(en)));
    }
  });
  it('uses the singular Arabic noun after 11+ and the plural for 3-10', () => {
    expect(translate('ar', 'causes.foodLow', { turns: 5 })).toContain('دورات');
    expect(translate('ar', 'common.turnsLeft', { n: 19 })).toContain('دورة');
    expect(translate('ar', 'common.turnsLeft', { n: 19 })).not.toContain('دورات');
    expect(translate('en', 'common.turnsLeft', { n: 19 })).toBe('≈ 19 turns');
  });
  it('sets right-to-left for Arabic only', () => {
    expect(ar.meta.dir).toBe('rtl');
    expect(en.meta.dir).toBe('ltr');
  });
});
