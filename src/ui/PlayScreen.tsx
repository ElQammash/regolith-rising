import { useEffect, useMemo, useRef, useState } from 'react';
import { forecast, resolveTurn, sunlitFraction, TUNING, type Decisions, type GameState, type TurnRecord } from '../engine';
import { useI18n } from '../i18n';
import Blocks from './Blocks';
import Coach from './Coach';
import Gauges from './Gauges';
import Report from './Report';
import Scene from './Scene';
import { play } from './sound';

const BLOCKS = 10;
const PASS_MS = 2600;

interface Plan {
  ls: number;
  gh: number;
  bat: number;
  maint: number;
  farm: number;
  reg: number;
}

function suggestPlan(state: GameState): Plan {
  const fc = forecast(state);
  const blockKWh = fc.generationKWh / BLOCKS;
  const blockH = fc.crewHours / BLOCKS;
  const ls = blockKWh > 0 ? Math.min(BLOCKS, Math.ceil(fc.lifeSupportNeedKWh / blockKWh)) : BLOCKS;
  const gh = blockKWh > 0 ? Math.min(BLOCKS - ls, Math.ceil(fc.greenhouseNeedKWh / blockKWh)) : 0;
  const maint = Math.min(BLOCKS, Math.ceil(fc.maintenanceNeedHours / blockH));
  const farm = Math.min(BLOCKS - maint, Math.ceil(fc.farmingNeedHours / blockH));
  return { ls, gh, bat: BLOCKS - ls - gh, maint, farm, reg: BLOCKS - maint - farm };
}

export function planToDecisions(p: Plan, spe: Decisions['spe']): Decisions {
  const freePower = BLOCKS - p.ls - p.gh - p.bat;
  const freeCrew = BLOCKS - p.maint - p.farm - p.reg;
  return {
    power: { lifeSupport: p.ls, greenhouse: p.gh, battery: p.bat + freePower },
    crew: { maintenance: p.maint + freeCrew, farming: p.farm, regolith: p.reg },
    spe,
  };
}

const TOUR_PLAY = ['scene', 'gauges', 'power', 'crew', 'end'];

interface Props {
  state: GameState;
  onState: (s: GameState) => void;
  onFinished: (s: GameState) => void;
  tutorial: boolean;
  onTutorialDone: () => void;
}

export default function PlayScreen({ state, onState, onFinished, tutorial, onTutorialDone }: Props) {
  const { t, n } = useI18n();
  const [plan, setPlan] = useState<Plan>(() => suggestPlan(state));
  const [spe, setSpe] = useState<Decisions['spe']>(undefined);
  const [passing, setPassing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<{ rec: TurnRecord; next: GameState } | null>(null);
  const [tourIdx, setTourIdx] = useState(tutorial ? 0 : -1);
  const raf = useRef(0);

  const fc = useMemo(() => forecast(state), [state]);
  const blockKWh = fc.generationKWh / BLOCKS;
  const blockH = fc.crewHours / BLOCKS;
  const needLs = blockKWh > 0 ? Math.ceil(fc.lifeSupportNeedKWh / blockKWh) : null;
  const needGh = state.loadout.greenhouse > 0 && blockKWh > 0 ? Math.ceil(fc.greenhouseNeedKWh / blockKWh) : null;
  const needMaint = Math.ceil(fc.maintenanceNeedHours / blockH);
  const needFarm = state.loadout.greenhouse > 0 ? Math.ceil(fc.farmingNeedHours / blockH) : null;

  // Event sounds when a turn starts
  useEffect(() => {
    setSpe(undefined);
    if (state.events.spe || state.events.failure) play('alarm');
    else if (state.events.dustStormStarted) play('storm');
  }, [state.turn, state.events]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const lsPreview = Math.min(1, (plan.ls * blockKWh + (state.events.failure === 'battery' ? 0 : state.res.batteryKWh)) / fc.lifeSupportNeedKWh);
  const ghPreview = fc.greenhouseNeedKWh > 0 ? Math.min(1, (plan.gh * blockKWh) / fc.greenhouseNeedKWh) : 0;
  const needSpe = state.events.spe && !spe;
  const nightNext = state.planet === 'moon' && state.turn + 1 < TUNING.turns && sunlitFraction('moon', state.turn + 1) < 0.5;

  const setRow = (keys: (keyof Plan)[]) => (key: string, v: number) => {
    const k = key as keyof Plan;
    const others = keys.filter((x) => x !== k).reduce((a, x) => a + plan[x], 0);
    setPlan({ ...plan, [k]: Math.max(0, Math.min(BLOCKS - others, v)) });
  };

  const endTurn = () => {
    if (needSpe || passing) return;
    const next = resolveTurn(state, planToDecisions(plan, spe));
    const rec = next.history[next.history.length - 1];
    play('endTurn');
    setPassing(true);
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / PASS_MS);
      setProgress(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else {
        setPassing(false);
        setReport({ rec, next });
        if (next.status === 'won') play('win');
        else if (next.status === 'lost') play('lose');
        else play(rec.report.causes.some((c) => ['foodLow', 'waterLow', 'o2Low', 'batteryEmpty', 'lsUnderpowered'].includes(c.key)) ? 'alarm' : 'good');
      }
    };
    raf.current = requestAnimationFrame(tick);
  };

  const closeReport = () => {
    if (!report) return;
    const { next } = report;
    setReport(null);
    if (next.status !== 'playing') onFinished(next);
    else {
      onState(next);
      // keep the player's split, but make sure it is valid
      setPlan((p) => ({ ...p }));
    }
  };

  const tourStep = tourIdx >= 0 && tourIdx < TOUR_PLAY.length && !report ? TOUR_PLAY[tourIdx] : null;
  const nextTour = () => setTourIdx((i) => i + 1);
  const skipTour = () => {
    setTourIdx(-1);
    onTutorialDone();
  };

  const day = Math.min(10, Math.floor(progress * 10) + 1);

  return (
    <div className="screen play">
      <div className="play-grid">
        <div className="col-left">
          <Gauges state={state} />
        </div>

        <div className="col-center">
          <div className="scene-wrap" id="tour-scene">
            <Scene state={state} preview={{ lsRatio: lsPreview, ghRatio: ghPreview }} passing={passing} progress={progress} sheltered={spe === 'shelter' && passing} />
            {passing && <div className="day-counter">{t('plan.passing', { n: day })}</div>}
          </div>
          <div className="banners">
            {state.events.dustTau !== null && <p className="banner dust">🌪 {state.events.dustStormStarted ? t('events.dustStart') + ' ' : ''}{t('events.dust', { tau: state.events.dustTau })}</p>}
            {state.planet === 'moon' && state.events.sunlitFraction < 0.5 && (
              <p className="banner night">🌑 {t('events.night', { pct: Math.round(state.events.sunlitFraction * 100) })}</p>
            )}
            {nightNext && state.events.sunlitFraction >= 0.5 && <p className="banner warn">🌘 {t('events.nightNext')}</p>}
            {state.events.failure && <p className="banner alert">🔧 {t(`events.failure.${state.events.failure}`)}</p>}
          </div>
          {state.events.spe && (
            <div className="spe-choice" role="group" aria-label={t('events.speTitle')}>
              <h3>☀⚠ {t('events.speTitle')}</h3>
              <p>{t('events.speBody')}</p>
              <div className="row-actions">
                <button type="button" className={`btn ${spe === 'shelter' ? 'primary' : ''}`} onClick={() => setSpe('shelter')}>
                  🏠 {t('events.shelter')}
                </button>
                <button type="button" className={`btn ${spe === 'work' ? 'danger' : ''}`} onClick={() => setSpe('work')}>
                  🛠 {t('events.work')}
                </button>
              </div>
            </div>
          )}
          {tourStep && <Coach step={tourStep} onNext={nextTour} onSkip={skipTour} />}
        </div>

        <div className="col-right">
          <Blocks
            id="tour-power"
            title={`⚡ ${t('plan.powerTitle')}`}
            help={t('plan.powerHelp', { kwh: Math.round(fc.generationKWh) })}
            total={BLOCKS}
            locked={passing}
            onChange={setRow(['ls', 'gh', 'bat'])}
            rows={[
              { key: 'ls', icon: '🫁', label: t('plan.lifeSupport'), value: plan.ls, need: needLs },
              {
                key: 'gh',
                icon: '🌱',
                label: t('plan.greenhouse'),
                value: plan.gh,
                need: needGh,
                disabled: state.loadout.greenhouse === 0,
                disabledNote: t('plan.noGreenhouse'),
              },
              { key: 'bat', icon: '🔋', label: t('plan.battery'), value: plan.bat, need: null, disabled: state.loadout.battery === 0, disabledNote: '—' },
            ]}
          />
          <Blocks
            id="tour-crew"
            title={`👩‍🚀 ${t('plan.crewTitle')}`}
            help={t('plan.crewHelp', { h: Math.round(fc.crewHours) })}
            total={BLOCKS}
            locked={passing}
            onChange={setRow(['maint', 'farm', 'reg'])}
            rows={[
              { key: 'maint', icon: '🔧', label: t('plan.maintenance'), value: plan.maint, need: needMaint },
              {
                key: 'farm',
                icon: '🧑‍🌾',
                label: t('plan.farming'),
                value: plan.farm,
                need: needFarm,
                disabled: state.loadout.greenhouse === 0,
                disabledNote: t('plan.noGreenhouse'),
              },
              { key: 'reg', icon: '⛰', label: t('plan.regolith'), value: plan.reg, need: null },
            ]}
          />
        </div>
      </div>

      <div className="sticky-actions" id="tour-end">
        <span className="turn-chip">{t('common.turn', { n: state.turn + 1, total: TUNING.turns })} · {t('common.day', { n: state.turn * TUNING.daysPerTurn + 1 })}</span>
        <button type="button" className="btn primary big" disabled={needSpe || passing} onClick={endTurn}>
          {needSpe ? t('plan.choose') : `⏩ ${t('plan.endTurn')}`}
        </button>
        <span className="sr-only">{n(state.turn)}</span>
      </div>

      {report && <Report rec={report.rec} next={report.next} onClose={closeReport} showTip={tutorial && state.turn === 0} />}
    </div>
  );
}
