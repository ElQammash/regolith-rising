import { NASA, type NasaKey } from '../data/nasa';
import { NEEDS, TUNING, type GameState } from '../engine';
import { useI18n } from '../i18n';
import SourceButton from './SourceButton';

type Level = 'ok' | 'warn' | 'danger';

interface GaugeProps {
  label: string;
  fill: number; // 0..1
  level: Level;
  value: string;
  sub?: string;
  icon: string;
  sources: NasaKey[];
  game?: string;
  id?: string;
}

function Gauge({ label, fill, level, value, sub, icon, sources, game, id }: GaugeProps) {
  return (
    <div className={`gauge gauge-${level}`} id={id}>
      <div className="gauge-head">
        <span className="gauge-icon" aria-hidden>{icon}</span>
        <span className="gauge-label">{label}</span>
        <SourceButton keys={sources} label={label} game={game} />
      </div>
      <div className="gauge-bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fill * 100)} aria-label={label}>
        <div className="gauge-fill" style={{ inlineSize: `${Math.max(2, Math.min(100, fill * 100))}%` }} />
      </div>
      <div className="gauge-value">
        {value}
        {sub && <small> · {sub}</small>}
      </div>
    </div>
  );
}

const levelByTurns = (turns: number): Level => (turns < 2 ? 'danger' : turns < 5 ? 'warn' : 'ok');

export default function Gauges({ state }: { state: GameState }) {
  const { t, n } = useI18n();
  const { res, loadout } = state;
  const foodTurns = res.food / NEEDS.foodCrewDays;
  // Water reserve: how many turns of "everything going wrong" (no recycling) it would last.
  const waterTurns = res.water / NEEDS.waterKg;
  const o2Turns = res.o2 / NEEDS.o2Kg;
  const cap = loadout.battery * TUNING.batteryKWh;
  const limit = NASA.careerDoseLimit.value;
  const doseFrac = state.dose / limit;

  return (
    <div className="gauges" id="tour-gauges">
      <Gauge
        icon="O₂"
        label={t('gauges.o2')}
        fill={Math.min(1, o2Turns / 4)}
        level={state.co2 > 50 ? 'danger' : o2Turns < 1 || state.co2 > 25 ? 'warn' : 'ok'}
        value={t('common.kg', { n: Math.round(res.o2) })}
        sub={`CO₂ ${n(Math.round(state.co2))}`}
        sources={['oxygenPerCrewDay', 'co2PerCrewDay']}
      />
      <Gauge
        icon="💧"
        label={t('gauges.water')}
        fill={Math.min(1, waterTurns / 8)}
        level={res.water < 60 ? 'danger' : res.water < 150 ? 'warn' : 'ok'}
        value={t('common.kg', { n: Math.round(res.water) })}
        sources={['waterPerCrewDay', 'issWaterRecovery']}
      />
      <Gauge
        icon="🥔"
        label={t('gauges.food')}
        fill={Math.min(1, foodTurns / 10)}
        level={levelByTurns(foodTurns)}
        value={t('common.turnsLeft', { n: Math.floor(foodTurns) })}
        sources={['packagedFoodPerCrewDay', 'cropPotatoEdibleFresh']}
      />
      <Gauge
        icon="🔋"
        label={t('gauges.power')}
        fill={cap > 0 ? res.batteryKWh / cap : 0}
        level={cap === 0 ? 'warn' : res.batteryKWh / cap < 0.25 ? 'warn' : 'ok'}
        value={`${n(Math.round(res.batteryKWh))} / ${n(cap)} kWh`}
        sources={[]}
        game="source.batteryGame"
      />
      <Gauge
        icon="❤"
        label={t('gauges.health')}
        fill={state.health / 100}
        level={state.health < 35 ? 'danger' : state.health < 65 ? 'warn' : 'ok'}
        value={`${n(Math.round(state.health))}%`}
        sources={['packagedFoodShelfLife']}
        game="source.healthGame"
      />
      <Gauge
        icon="☢"
        label={t('gauges.dose')}
        fill={doseFrac}
        level={doseFrac > 0.85 ? 'danger' : doseFrac > 0.7 ? 'warn' : 'ok'}
        value={t('gauges.doseOf', { n: Math.round(state.dose), limit })}
        sub={`${t('gauges.shield')} ${n(Math.round(state.shield * 100))}%`}
        sources={state.planet === 'mars' ? ['careerDoseLimit', 'marsSurfaceDose', 'marsTransitDose'] : ['careerDoseLimit', 'lunarSurfaceDose']}
      />
    </div>
  );
}
