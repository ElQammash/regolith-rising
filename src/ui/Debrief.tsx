import { useMemo } from 'react';
import { NASA } from '../data/nasa';
import { analyzeMission, starsFor, TUNING, type GameState, type Moment } from '../engine';
import { useI18n } from '../i18n';

interface Props {
  state: GameState;
  onRetry: (turn: number) => void;
  onRetryCargo: () => void;
  onNew: () => void;
}

function Chart({ state, highlight, end }: { state: GameState; highlight: number | null; end: number }) {
  const { t } = useI18n();
  const d = useMemo(() => analyzeMission(state).series, [state]);
  const W = 320;
  const H = 120;
  const x = (turn: number) => 10 + (turn / (TUNING.turns - 1)) * (W - 20);
  const line = (vals: number[], max: number) =>
    vals.map((v, i) => `${i ? 'L' : 'M'}${x(d[i].turn).toFixed(1)},${(H - 10 - Math.max(0, Math.min(1, v / max)) * (H - 20)).toFixed(1)}`).join(' ');
  const series = [
    { key: 'food', color: '#e0a339', vals: d.map((p) => p.food), max: 25 },
    { key: 'water', color: '#3fa9f5', vals: d.map((p) => p.water), max: 900 },
    { key: 'health', color: '#ef5f7a', vals: d.map((p) => p.health), max: 100 },
    { key: 'dose', color: '#b48cff', vals: d.map((p) => p.dose), max: NASA.careerDoseLimit.value },
  ];
  return (
    <figure className="chart">
      <figcaption>{t('debrief.chart')}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('debrief.chart')}>
        <rect x="0" y="0" width={W} height={H} fill="none" />
        {highlight !== null && highlight >= 0 && (
          <g>
            <line x1={x(highlight)} x2={x(highlight)} y1="6" y2={H - 6} stroke="#ffd24d" strokeWidth="2" strokeDasharray="3 2" />
            <circle cx={x(highlight)} cy="8" r="4" fill="#ffd24d" />
          </g>
        )}
        {state.status === 'lost' && <line x1={x(end)} x2={x(end)} y1="6" y2={H - 6} stroke="#ff5a4d" strokeWidth="2" />}
        {series.map((s) => (
          <path key={s.key} d={line(s.vals, s.max)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
        ))}
        <line x1="10" x2={W - 10} y1={H - 10} y2={H - 10} stroke="#556" />
      </svg>
      <div className="legend">
        {series.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} /> {t(`gauges.${s.key}`)}
          </span>
        ))}
      </div>
    </figure>
  );
}

export default function Debrief({ state, onRetry, onRetryCargo, onNew }: Props) {
  const { t } = useI18n();
  const deb = useMemo(() => analyzeMission(state), [state]);
  const stars = starsFor(state);
  const decisive = deb.moments.find((m) => m.decisive) ?? null;
  const others = deb.moments.filter((m) => m !== decisive);
  const momentText = (m: Moment) => t(`debrief.moments.${m.key}`, { ...m.params, turn: m.turn + 1 });
  const won = state.status === 'won';

  return (
    <div className="screen debrief">
      <header className={`debrief-head ${won ? 'won' : 'lost'}`}>
        <h1>{won ? `🎉 ${t('debrief.won')}` : `💥 ${t('debrief.lost')}`}</h1>
        {won ? (
          <p className="stars" aria-label={t('debrief.stars', { n: stars })}>
            {'★'.repeat(stars)}
            <span className="dim">{'★'.repeat(3 - stars)}</span>
          </p>
        ) : (
          <p>{t(`debrief.lossReason.${state.lossReason}`, { n: deb.endTurn + 1 })}</p>
        )}
        {won && <small>{t('debrief.starHelp')}</small>}
      </header>

      {decisive && (
        <section className="panel key-moment">
          <h2>🔎 {t('debrief.keyMoment')}</h2>
          <p className="big-sentence">{momentText(decisive)}</p>
        </section>
      )}

      <section className="panel">
        <h2>{t('debrief.timeline')}</h2>
        <ol className="timeline" aria-label={t('debrief.timeline')}>
          <li className={`tl-dot cargo ${decisive?.turn === -1 ? 'key' : ''}`} title={t('debrief.beforeLaunch')}>
            🚀
          </li>
          {state.history.map((r) => {
            const bad = r.lsRatio < 0.8 || r.report.causes.some((c) => ['foodLow', 'waterLow', 'o2Low', 'greenhouseWilting', 'speWorked'].includes(c.key));
            const event = r.events.spe ? '☀' : r.events.dustTau !== null ? '🌪' : r.events.failure ? '🔧' : r.events.sunlitFraction < 0.5 ? '🌑' : '';
            return (
              <li key={r.turn} className={`tl-dot ${bad ? 'bad' : 'good'} ${decisive?.turn === r.turn ? 'key' : ''}`} title={`${r.turn + 1}`}>
                {event || r.turn + 1}
              </li>
            );
          })}
        </ol>
        <Chart state={state} highlight={decisive ? decisive.turn : null} end={deb.endTurn} />
      </section>

      {others.length > 0 && (
        <section className="panel">
          <h2>✅ {t('debrief.otherMoments')}</h2>
          <ul className="moments">
            {others.map((m, i) => (
              <li key={i}>{momentText(m)}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="row-actions center">
        {decisive && decisive.turn >= 0 ? (
          <button type="button" className="btn primary big" onClick={() => onRetry(decisive.turn)}>
            ↺ {t('debrief.retry', { n: decisive.turn + 1 })}
          </button>
        ) : null}
        <button type="button" className={`btn ${decisive && decisive.turn >= 0 ? '' : 'primary big'}`} onClick={onRetryCargo}>
          🚀 {t('debrief.retryStart')}
        </button>
        <button type="button" className="btn ghost" onClick={onNew}>
          {t('debrief.newMission')}
        </button>
      </div>
    </div>
  );
}
