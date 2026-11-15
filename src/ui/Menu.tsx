import type { NasaKey } from '../data/nasa';
import { NASA } from '../data/nasa';
import type { GameState, Planet } from '../engine';
import { useI18n } from '../i18n';
import SourceButton from './SourceButton';

interface Props {
  saved: GameState | null;
  best: Record<Planet, number>;
  tutorialDone: boolean;
  onStart: (p: Planet) => void;
  onTutorial: () => void;
  onResume: () => void;
  onAccount?: () => void;
}

function Fact({ label, value, keys }: { label: string; value: string; keys: NasaKey[] }) {
  return (
    <div className="fact-row">
      <span>{label}</span>
      <strong dir="auto">{value}</strong>
      <SourceButton keys={keys} label={label} />
    </div>
  );
}

export default function Menu({ saved, best, tutorialDone, onStart, onTutorial, onResume, onAccount }: Props) {
  const { t, n } = useI18n();
  const card = (p: Planet) => {
    const moon = p === 'moon';
    return (
      <article className={`world ${p}`} key={p}>
        <div className="world-art" aria-hidden>
          <span className="planet-ball" />
        </div>
        <h2>{t(`menu.${p}`)}</h2>
        <p>{t(moon ? 'menu.moonFacts' : 'menu.marsFacts')}</p>
        <Fact label={t('menu.gravity')} value={`${n(Math.round((moon ? NASA.moonGravity.value : NASA.marsGravity.value) * 100))}%`} keys={[moon ? 'moonGravity' : 'marsGravity']} />
        <Fact label={t('menu.dayLength')} value={t(moon ? 'menu.moonDay' : 'menu.marsDay')} keys={[moon ? 'moonSynodicDays' : 'marsSolHours']} />
        <Fact
          label={t('menu.sunlight')}
          value={`${n(moon ? NASA.solarIrradianceMoon.value : NASA.solarIrradianceMars.value)} W/m²`}
          keys={[moon ? 'solarIrradianceMoon' : 'solarIrradianceMars']}
        />
        <Fact
          label={t('menu.radiation')}
          value={`${n(moon ? NASA.lunarSurfaceDose.value : NASA.marsSurfaceDose.value, 2)} mSv/${moon ? 'd' : 'd'}`}
          keys={[moon ? 'lunarSurfaceDose' : 'marsSurfaceDose']}
        />
        {best[p] > 0 && <p className="best">{t('menu.best', { stars: '★'.repeat(best[p]) })}</p>}
        <button type="button" className="btn primary" onClick={() => onStart(p)}>
          {t('menu.start')}
        </button>
      </article>
    );
  };
  return (
    <div className="screen menu">
      <header className="hero">
        <h1>{t('app.title')}</h1>
        <p>{t('app.tagline')}</p>
      </header>
      <div className="row-actions center">
        {saved && saved.status === 'playing' && (
          <button type="button" className="btn primary big" onClick={onResume}>
            ▶ {t('menu.resume', { n: saved.turn + 1 })}
          </button>
        )}
        <button type="button" className={`btn ${tutorialDone ? '' : 'primary big'}`} onClick={onTutorial}>
          🧑‍🚀 {t('menu.tutorial')}
        </button>
      </div>
      <h2 className="section-title">{t('menu.chooseWorld')}</h2>
      <div className="worlds">{(['moon', 'mars'] as Planet[]).map(card)}</div>
      {onAccount && (
        <div className="row-actions center">
          <button type="button" className="btn ghost" onClick={onAccount}>
            ☁ {t('menu.account')}
          </button>
        </div>
      )}
      <footer className="credits">{t('app.team')}</footer>
    </div>
  );
}
