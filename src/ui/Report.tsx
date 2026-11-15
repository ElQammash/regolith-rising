import { useEffect, useRef } from 'react';
import type { Cause, GameState, TurnRecord } from '../engine';
import { useI18n } from '../i18n';
import { FACT_SOURCES } from './facts';
import SourceButton from './SourceButton';

// Most explanatory causes first: the event, then what it did.
const PRIORITY: Cause['key'][] = [
  'foodLow', 'waterLow', 'o2Low', 'doseHigh',
  'speWorked', 'speSheltered', 'dustStorm', 'lunarNight', 'failure', 'batteryEmpty', 'lsUnderpowered',
  'waterRecoveryLow', 'co2Rising', 'greenhouseWilting',
  'batteryCovered', 'co2Cleared', 'greenhouseThriving', 'greenhouseYoung', 'shieldBuilt', 'allGood',
];

export function topCauses(causes: Cause[], max = 2): Cause[] {
  return [...causes].sort((a, b) => PRIORITY.indexOf(a.key) - PRIORITY.indexOf(b.key)).slice(0, max);
}

export function causeText(t: (k: string, p?: Record<string, string | number>) => string, c: Cause): string {
  const params = { ...(c.params ?? {}) };
  if (c.key === 'failure' && typeof params.kind === 'string') params.kind = t(`failureKinds.${params.kind}`);
  return t(`causes.${c.key}`, params);
}

export default function Report({ rec, next, onClose, showTip }: { rec: TurnRecord; next: GameState; onClose: () => void; showTip?: boolean }) {
  const { t, n } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  const d = rec.report.delta;
  const chip = (label: string, raw: number, unit: string, goodUp = true) => {
    const digits = Math.abs(raw) < 10 ? 1 : 0;
    const v = Math.round(raw * 10 ** digits) / 10 ** digits;
    const cls = v === 0 ? 'flat' : (v > 0) === goodUp ? 'up' : 'down';
    return (
      <span className={`chip ${cls}`}>
        {label} {v > 0 ? '+' : ''}
        {n(v === 0 ? 0 : v, digits)} {unit}
      </span>
    );
  };
  const over = next.status !== 'playing';
  return (
    <dialog ref={ref} className="report" onCancel={(e) => e.preventDefault()}>
      <h2>{t('report.title', { n: rec.turn + 1 })}</h2>
      <ul className="causes">
        {topCauses(rec.report.causes).map((c, i) => (
          <li key={i}>{causeText(t, c)}</li>
        ))}
      </ul>
      <div className="chips">
        {chip(t('gauges.food'), d.food / 40, t('common.turnsUnit'), true)}
        {chip(t('gauges.water'), d.water, 'kg')}
        {chip(t('gauges.o2'), d.o2, 'kg')}
        {chip(t('gauges.health'), d.health, '%')}
        {chip(t('gauges.dose'), d.dose, 'mSv', false)}
      </div>
      <aside className="fact">
        <h3>🛰 {t('report.fact')}</h3>
        <p>{t(`facts.${rec.report.factKey}`)}</p>
        <SourceButton keys={FACT_SOURCES[rec.report.factKey] ?? []} />
      </aside>
      {showTip && <p className="coach-inline">🧑‍🚀 {t('tutorial.steps.report')}</p>}
      <button type="button" className="btn primary big" autoFocus onClick={onClose}>
        {over ? t('report.debrief') : t('report.next')}
      </button>
    </dialog>
  );
}
