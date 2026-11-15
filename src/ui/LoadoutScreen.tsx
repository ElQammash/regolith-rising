import { useState } from 'react';
import { CARGO, CARGO_ORDER, cargoMass, emptyLoadout, massBudget, type CargoId, type Loadout, type Planet } from '../engine';
import { useI18n } from '../i18n';
import Coach from './Coach';
import SourceButton from './SourceButton';
import { play } from './sound';

const ICONS: Record<CargoId, string> = {
  food: '🥫',
  water: '💧',
  oxygen: '🫧',
  greenhouse: '🌱',
  solar: '☀',
  battery: '🔋',
  fission: '⚛',
  shield: '🛡',
  moxie: '🌬',
};

/** A safe-but-not-perfect starter cargo, used by the guided first mission. */
export function starterLoadout(planet: Planet): Loadout {
  return planet === 'moon'
    ? { ...emptyLoadout(), food: 21, water: 7, oxygen: 2, greenhouse: 1, solar: 2, battery: 1, fission: 2 }
    : { ...emptyLoadout(), food: 20, water: 6, oxygen: 2, greenhouse: 1, solar: 5, battery: 1, fission: 1, moxie: 1 };
}

interface Props {
  planet: Planet;
  initial?: Loadout;
  onLaunch: (l: Loadout) => void;
  onBack: () => void;
  tutorial?: boolean;
}

export default function LoadoutScreen({ planet, initial, onLaunch, onBack, tutorial }: Props) {
  const { t, n } = useI18n();
  const [l, setL] = useState<Loadout>(initial ?? emptyLoadout());
  const [showCoach, setShowCoach] = useState(!!tutorial);
  const budget = massBudget(planet);
  const mass = cargoMass(l);
  const over = mass - budget;
  const ids = CARGO_ORDER.filter((id) => CARGO[id].planets.includes(planet));

  const change = (id: CargoId, d: number) => {
    play('click');
    setL((x) => ({ ...x, [id]: Math.max(0, Math.min(CARGO[id].max, x[id] + d)) }));
  };

  return (
    <div className="screen loadout">
      <header className="topbar">
        <button type="button" className="btn ghost" onClick={onBack}>
          ← {t('common.back')}
        </button>
        <h1>{t('cargo.title')}</h1>
      </header>
      {showCoach && <Coach step="cargo" onNext={() => setShowCoach(false)} onSkip={() => setShowCoach(false)} />}
      <p className="intro">{t('cargo.intro', { budget })}</p>
      <div className={`massbar ${over > 0 ? 'over' : ''}`} id="tour-cargo">
        <div className="massbar-fill" style={{ inlineSize: `${Math.min(100, (mass / budget) * 100)}%` }} />
        <span>{over > 0 ? t('cargo.over', { n: Math.ceil(over) }) : t('cargo.mass', { mass: Math.round(mass), budget })}</span>
      </div>
      <div className="row-actions">
        <button type="button" className="btn" onClick={() => setL(starterLoadout(planet))}>
          {t('cargo.suggested')}
        </button>
        <button type="button" className="btn ghost" onClick={() => setL(emptyLoadout())}>
          {t('cargo.clear')}
        </button>
      </div>
      <ul className="crates">
        {ids.map((id) => {
          const spec = CARGO[id];
          const canAdd = l[id] < spec.max && mass + spec.massKg <= budget;
          return (
            <li key={id} className={`crate ${l[id] > 0 ? 'picked' : ''}`}>
              <span className="crate-icon" aria-hidden>{ICONS[id]}</span>
              <div className="crate-text">
                <strong>{t(`cargo.${id}.name`)}</strong>
                <small>{t(`cargo.${id}.desc`)}</small>
                <small className="crate-mass">
                  {t('common.kg', { n: spec.massKg })} {spec.massIsGameValue ? '' : '✓'}
                  <SourceButton keys={spec.dataKeys} label={t(`cargo.${id}.name`)} />
                </small>
              </div>
              <div className="stepper">
                <button type="button" className="step" aria-label={`− ${t(`cargo.${id}.name`)}`} disabled={l[id] <= 0} onClick={() => change(id, -1)}>
                  −
                </button>
                <span className="count">{n(l[id])}</span>
                <button type="button" className="step" aria-label={`+ ${t(`cargo.${id}.name`)}`} disabled={!canAdd} onClick={() => change(id, 1)}>
                  +
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="tip">{t('cargo.regolithNote')}</p>
      <div className="sticky-actions">
        <button
          type="button"
          className="btn primary big"
          disabled={over > 0 || mass === 0}
          onClick={() => {
            play('launch');
            onLaunch(l);
          }}
        >
          🚀 {t('cargo.launch')}
        </button>
      </div>
    </div>
  );
}
