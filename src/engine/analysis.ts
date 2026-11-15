import { NASA } from '../data/nasa';
import { CRATE_AMOUNT } from './cargo';
import { NEEDS } from './sim';
import type { GameState, TurnRecord } from './types';

export type MomentKey =
  | 'cutGreenhousePower'
  | 'cutFarming'
  | 'packedTooLittleFood'
  | 'packedTooLittleWater'
  | 'packedTooLittleOxygen'
  | 'underpoweredLifeSupport'
  | 'darkWithoutStorage'
  | 'workedThroughStorm'
  | 'lowShielding'
  | 'skippedMaintenance'
  | 'builtShielding'
  | 'shelteredFromStorm'
  | 'greenhouseFedCrew'
  | 'storageCoveredNight';

export interface Moment {
  key: MomentKey;
  turn: number; // -1 = cargo loadout (before launch)
  consequenceTurn?: number;
  params: Record<string, number | string>;
  decisive: boolean; // the single decision we point to
}

export interface Debrief {
  outcome: GameState['status'];
  lossReason: GameState['lossReason'];
  endTurn: number;
  moments: Moment[];
  retryTurn: number; // suggested turn to retry from (0 = start of mission)
  series: { turn: number; food: number; water: number; o2: number; health: number; dose: number; battery: number }[];
}

export function analyzeMission(state: GameState): Debrief {
  const h = state.history;
  const endTurn = h.length ? h[h.length - 1].turn : 0;
  const moments: Moment[] = [];

  if (state.status === 'lost') {
    const m = findCause(state, h, endTurn);
    if (m) moments.push({ ...m, decisive: true, consequenceTurn: endTurn });
  }
  // Positive moments (shown for wins, and as contrast for losses).
  moments.push(...findGoodMoments(state, h));

  if (state.status === 'won' && moments.length > 0) {
    // The decisive moment of a win: the one that saved the most.
    moments[0].decisive = true;
  }

  const decisive = moments.find((m) => m.decisive);
  const retryTurn = decisive ? Math.max(0, decisive.turn) : 0;

  return {
    outcome: state.status,
    lossReason: state.lossReason,
    endTurn,
    moments: moments.slice(0, 4),
    retryTurn,
    series: h.map((r) => ({
      turn: r.turn,
      food: r.after.res.food / NEEDS.foodCrewDays,
      water: r.after.res.water,
      o2: r.after.res.o2,
      health: r.after.health,
      dose: r.after.dose,
      battery: r.after.res.batteryKWh,
    })),
  };
}

function firstTurn(h: TurnRecord[], pred: (r: TurnRecord) => boolean): TurnRecord | undefined {
  return h.find(pred);
}

function findCause(state: GameState, h: TurnRecord[], endTurn: number): Omit<Moment, 'decisive'> | null {
  const l = state.loadout;
  switch (state.lossReason) {
    case 'food': {
      if (l.greenhouse > 0) {
        // A "cut" is a choice: power was available, but the player sent it elsewhere.
        const chosenCut = (r: TurnRecord) => {
          const spare = r.forecast.generationKWh - r.forecast.lifeSupportNeedKWh * 0.9;
          return r.greenhouseRatio < 0.6 && spare >= r.forecast.greenhouseNeedKWh * 0.6;
        };
        const cutPower = firstTurn(h, (r) => r.turn > 0 && chosenCut(r)) ?? firstTurn(h, (r) => r.turn > 0 && r.greenhouseRatio < 0.6);
        const cutFarm = firstTurn(h, (r) => r.turn > 0 && r.farmRatio < 0.6 && r.decisions.spe !== 'shelter');
        const pick = [cutPower, cutFarm].filter(Boolean).sort((a, b) => a!.turn - b!.turn)[0];
        if (pick) {
          const isPower = pick === cutPower;
          return {
            key: isPower ? 'cutGreenhousePower' : 'cutFarming',
            turn: pick.turn,
            params: { pct: Math.round((isPower ? pick.greenhouseRatio : pick.farmRatio) * 100), later: endTurn - pick.turn },
          };
        }
      }
      return { key: 'packedTooLittleFood', turn: -1, params: { crates: l.food, turns: Math.round((l.food * CRATE_AMOUNT.foodCrewDays) / NEEDS.foodCrewDays) } };
    }
    case 'water':
    case 'oxygen':
    case 'health': {
      const dark = firstTurn(h, (r) => r.lsRatio < 0.8 && r.events.sunlitFraction < 0.5 && r.forecast.generationKWh < r.forecast.lifeSupportNeedKWh);
      const under = firstTurn(h, (r) => r.lsRatio < 0.8);
      if (dark && (!under || dark.turn <= under.turn)) {
        return { key: 'darkWithoutStorage', turn: dark.turn, params: { pct: Math.round(dark.lsRatio * 100), later: endTurn - dark.turn } };
      }
      if (under) {
        const choseLow = under.forecast.generationKWh * under.decisions.power.lifeSupport < under.forecast.lifeSupportNeedKWh && under.forecast.generationKWh >= under.forecast.lifeSupportNeedKWh;
        if (choseLow || under.events.dustTau === null) {
          return { key: 'underpoweredLifeSupport', turn: under.turn, params: { pct: Math.round(under.lsRatio * 100), later: endTurn - under.turn } };
        }
        return { key: 'darkWithoutStorage', turn: under.turn, params: { pct: Math.round(under.lsRatio * 100), later: endTurn - under.turn } };
      }
      const skipped = firstTurn(h, (r) => r.maintRatio < 0.5);
      if (skipped) return { key: 'skippedMaintenance', turn: skipped.turn, params: { pct: Math.round(skipped.maintRatio * 100), later: endTurn - skipped.turn } };
      if (state.lossReason === 'oxygen') return { key: 'packedTooLittleOxygen', turn: -1, params: { crates: l.oxygen } };
      return { key: 'packedTooLittleWater', turn: -1, params: { crates: l.water } };
    }
    case 'radiation': {
      const worked = h.filter((r) => r.decisions.spe === 'work');
      if (worked.length > 0) {
        const worst = worked.reduce((a, b) => (b.report.delta.dose > a.report.delta.dose ? b : a));
        return { key: 'workedThroughStorm', turn: worst.turn, params: { dose: Math.round(worst.report.delta.dose), later: endTurn - worst.turn } };
      }
      return { key: 'lowShielding', turn: -1, params: { pct: Math.round((h[0]?.before.shield ?? 0) * 100), limit: NASA.careerDoseLimit.value } };
    }
    default:
      return null;
  }
}

function findGoodMoments(state: GameState, h: TurnRecord[]): Moment[] {
  const out: Moment[] = [];
  const built = h.filter((r) => r.report.delta.shield > 0.02);
  if (built.length > 0) {
    out.push({ key: 'builtShielding', turn: built[0].turn, params: { pct: Math.round(state.shield * 100) }, decisive: false });
  }
  const sheltered = h.find((r) => r.decisions.spe === 'shelter');
  if (sheltered) {
    const saved = Math.round(sheltered.forecast.doseThisTurn >= 0 ? sheltered.report.delta.dose : 0);
    out.push({ key: 'shelteredFromStorm', turn: sheltered.turn, params: { dose: saved }, decisive: false });
  }
  const covered = h.find((r) => r.events.sunlitFraction < 0.5 && r.lsRatio >= 0.95);
  if (covered && state.planet === 'moon') out.push({ key: 'storageCoveredNight', turn: covered.turn, params: {}, decisive: false });
  const fed = h.filter((r) => r.report.causes.some((c) => c.key === 'greenhouseThriving'));
  if (fed.length >= 5) out.push({ key: 'greenhouseFedCrew', turn: fed[0].turn, params: { turns: fed.length }, decisive: false });
  return out;
}
