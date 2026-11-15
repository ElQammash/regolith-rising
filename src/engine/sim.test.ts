import { describe, expect, it } from 'vitest';
import { NASA } from '../data/nasa';
import { analyzeMission } from './analysis';
import { CARGO, cargoMass, emptyLoadout, validateLoadout } from './cargo';
import { Rng } from './rng';
import { createMission, forecast, NEEDS, resolveTurn, retryFromTurn, starsFor, sunlitFraction, transitDose } from './sim';
import { decide, loadoutFor } from './strategies';
import { TUNING } from './tuning';
import type { Decisions, GameState, Loadout } from './types';

const FULL: Decisions = {
  power: { lifeSupport: 1, greenhouse: 0, battery: 0 },
  crew: { maintenance: 1, farming: 0, regolith: 0 },
  spe: 'shelter',
};

function moonBase(over: Partial<Loadout> = {}): Loadout {
  return { ...emptyLoadout(), food: 20, water: 8, oxygen: 2, solar: 2, battery: 1, fission: 2, ...over };
}

function play(state: GameState, d: Decisions | ((s: GameState) => Decisions), turns = 30): GameState {
  let s = state;
  for (let i = 0; i < turns && s.status === 'playing'; i++) s = resolveTurn(s, typeof d === 'function' ? d(s) : d);
  return s;
}

describe('NASA data file', () => {
  it('gives every entry a value, unit, source name and https URL', () => {
    for (const [key, e] of Object.entries(NASA)) {
      expect(Number.isFinite(e.value), key).toBe(true);
      expect(e.unit.length, key).toBeGreaterThan(0);
      expect(e.sourceName.length, key).toBeGreaterThan(5);
      expect(e.sourceUrl, key).toMatch(/^https:\/\//);
    }
  });
  it('explains every simplified or derived number in a note', () => {
    for (const [key, e] of Object.entries(NASA)) {
      if (e.simplified || (e.verification as string) === 'derived') expect((e as { note?: string }).note, key).toBeTruthy();
    }
  });
  it('labels non-NASA sources in the source name', () => {
    for (const [key, e] of Object.entries(NASA)) {
      if (!e.nasa) expect(e.sourceName, key).toMatch(/NOT/);
    }
  });
});

describe('lunar day and night', () => {
  it('uses the 29.53-day synodic month', () => {
    expect(sunlitFraction('moon', 0)).toBeCloseTo(1, 5);
    expect(sunlitFraction('moon', 1)).toBeCloseTo((NASA.moonSynodicDays.value / 2 - 10) / 10, 5);
    expect(sunlitFraction('moon', 2)).toBeCloseTo((30 - NASA.moonSynodicDays.value) / 10, 5);
  });
  it('is sunlit about half the mission', () => {
    let sum = 0;
    for (let t = 0; t < 30; t++) sum += sunlitFraction('moon', t);
    expect(sum / 30).toBeGreaterThan(0.45);
    expect(sum / 30).toBeLessThan(0.55);
  });
  it('gives Mars a normal day every sol (no long nights)', () => {
    for (let t = 0; t < 30; t++) expect(sunlitFraction('mars', t)).toBe(1);
  });
});

describe('cargo loadout', () => {
  it('rejects cargo over the mass budget', () => {
    const l = { ...emptyLoadout(), food: 30, battery: 8 };
    const v = validateLoadout('moon', l);
    expect(v.ok).toBe(false);
    expect(v.mass).toBe(cargoMass(l));
  });
  it('does not allow MOXIE on the Moon (no CO2 atmosphere)', () => {
    expect(validateLoadout('moon', { ...emptyLoadout(), moxie: 1 }).ok).toBe(false);
    expect(validateLoadout('mars', { ...emptyLoadout(), moxie: 1 }).ok).toBe(true);
  });
  it('sizes a food crate from BVAD packaged food mass', () => {
    expect(CARGO.food.massKg).toBeCloseTo(40 * NASA.packagedFoodPerCrewDay.value, 1);
  });
});

describe('mission start', () => {
  it('Mars crew arrives carrying the transit dose; Moon crew does not', () => {
    const mars = createMission('mars', { ...emptyLoadout(), food: 5 }, 1);
    const moon = createMission('moon', { ...emptyLoadout(), food: 5 }, 1);
    expect(mars.dose).toBeCloseTo(NASA.marsTransitDose.value * NASA.marsTransitDays.value, 5);
    expect(transitDose('moon')).toBe(0);
    expect(moon.dose).toBe(0);
  });
  it('is deterministic for the same seed and decisions', () => {
    const a = play(createMission('moon', moonBase(), 42), FULL);
    const b = play(createMission('moon', moonBase(), 42), FULL);
    expect(a.history.map((r) => r.after)).toEqual(b.history.map((r) => r.after));
  });
});

describe('power trade-offs', () => {
  it('underpowered life support recycles less water and lets CO2 rise', () => {
    const s0 = createMission('moon', moonBase(), 7);
    const good = resolveTurn(s0, FULL);
    const bad = resolveTurn(s0, { ...FULL, power: { lifeSupport: 0.2, greenhouse: 0, battery: 0.8 } });
    // battery covers part of the gap, so drain it first to see the effect clearly
    const drained = { ...s0, res: { ...s0.res, batteryKWh: 0 } };
    const bad2 = resolveTurn(drained, { ...FULL, power: { lifeSupport: 0.1, greenhouse: 0, battery: 0.9 } });
    expect(bad2.history[0].lsRatio).toBeLessThan(0.5);
    expect(bad2.res.water).toBeLessThan(good.res.water);
    expect(bad2.co2).toBeGreaterThan(good.co2);
    expect(bad.res.batteryKWh).toBeLessThanOrEqual(s0.loadout.battery * TUNING.batteryKWh);
  });
  it('batteries cover a life-support shortfall automatically', () => {
    const s0 = createMission('moon', moonBase(), 7);
    const r = resolveTurn(s0, { ...FULL, power: { lifeSupport: 0.1, greenhouse: 0.9, battery: 0 } });
    expect(r.res.batteryKWh).toBeLessThan(s0.res.batteryKWh);
  });
  it('a lunar-night turn produces almost no solar power', () => {
    const s = createMission('moon', moonBase(), 3);
    const night = { ...s, turn: 2, events: { ...s.events, sunlitFraction: sunlitFraction('moon', 2) } };
    expect(forecast(night).solarKWh).toBeLessThan(forecast(s).solarKWh * 0.1);
    expect(forecast(night).fissionKWh).toBe(forecast(s).fissionKWh);
  });
  it('a dust storm cuts solar power on Mars', () => {
    const s = createMission('mars', { ...emptyLoadout(), food: 10, solar: 5 }, 3);
    const storm = { ...s, events: { ...s.events, dustTau: 7 } };
    expect(forecast(storm).solarKWh).toBeLessThan(forecast(s).solarKWh * 0.2);
  });
});

describe('greenhouse', () => {
  it('a tended greenhouse feeds the crew; an untended one wilts', () => {
    const l = moonBase({ food: 12, greenhouse: 1, fission: 3, solar: 3 });
    const tend: Decisions = { power: { lifeSupport: 0.6, greenhouse: 0.4, battery: 0 }, crew: { maintenance: 0.5, farming: 0.5, regolith: 0 }, spe: 'shelter' };
    const neglect: Decisions = { power: { lifeSupport: 1, greenhouse: 0, battery: 0 }, crew: { maintenance: 1, farming: 0, regolith: 0 }, spe: 'shelter' };
    const a = play(createMission('moon', l, 5), tend, 8);
    const b = play(createMission('moon', l, 5), neglect, 8);
    expect(a.res.food).toBeGreaterThan(b.res.food);
    expect(a.plantHealth).toBeGreaterThan(b.plantHealth);
  });
});

describe('solar particle events', () => {
  it('sheltering takes less dose but loses the turn’s work', () => {
    const s0 = createMission('moon', moonBase(), 9);
    const spe = { ...s0, events: { ...s0.events, spe: true } };
    const dig: Decisions = { ...FULL, crew: { maintenance: 0.3, farming: 0, regolith: 0.7 } };
    const shelter = resolveTurn(spe, { ...dig, spe: 'shelter' });
    const work = resolveTurn(spe, { ...dig, spe: 'work' });
    expect(shelter.dose).toBeLessThan(work.dose);
    expect(shelter.shield).toBe(s0.shield); // no regolith piled while sheltering
    expect(work.shield).toBeGreaterThan(s0.shield);
  });
});

describe('end of mission', () => {
  it('fails when food runs out, and the debrief blames the cargo', () => {
    const s = play(createMission('moon', moonBase({ food: 3 }), 11), FULL);
    expect(s.status).toBe('lost');
    expect(s.lossReason).toBe('food');
    const d = analyzeMission(s);
    expect(d.moments[0].key).toBe('packedTooLittleFood');
    expect(d.moments[0].turn).toBe(-1);
  });
  it('points to the turn the greenhouse power was cut', () => {
    const l = moonBase({ food: 8, greenhouse: 2, fission: 3, solar: 3, water: 6 });
    const tend: Decisions = { power: { lifeSupport: 0.5, greenhouse: 0.5, battery: 0 }, crew: { maintenance: 0.4, farming: 0.6, regolith: 0 }, spe: 'shelter' };
    const cut: Decisions = { ...tend, power: { lifeSupport: 1, greenhouse: 0, battery: 0 } };
    const s = play(createMission('moon', l, 13), (st) => (st.turn < 4 ? tend : cut));
    expect(s.lossReason).toBe('food');
    const decisive = analyzeMission(s).moments.find((m) => m.decisive)!;
    expect(decisive.key).toBe('cutGreenhousePower');
    expect(decisive.turn).toBe(4);
    expect(analyzeMission(s).retryTurn).toBe(4);
  });
  it('fails when the dose passes the career limit', () => {
    const s0 = createMission('mars', { ...emptyLoadout(), food: 30, water: 6 }, 1);
    const s = play({ ...s0, dose: NASA.careerDoseLimit.value - 1 }, FULL, 1);
    expect(s.status).toBe('lost');
    expect(s.lossReason).toBe('radiation');
  });
  it('retry restores the exact state of that turn', () => {
    const s = play(createMission('moon', moonBase(), 21), FULL, 6);
    const r = retryFromTurn(s, 3);
    expect(r.turn).toBe(3);
    expect(r.history.length).toBe(3);
    expect(r.events).toEqual(s.history[3].events);
    expect(r.res).toEqual(s.history[3].before.res);
  });
  it('a thoughtful bot can win and earns stars', () => {
    const rng = new Rng(1000 ^ 0x9e3779b9);
    const l = loadoutFor('thoughtful', 'moon', rng);
    const s = play(createMission('moon', l, 1000), (st) => decide('thoughtful', st, rng));
    expect(s.status).toBe('won');
    expect(starsFor(s)).toBeGreaterThanOrEqual(1);
    expect(s.history.length).toBe(TUNING.turns);
  });
  it('uses BVAD crew needs per turn', () => {
    expect(NEEDS.o2Kg).toBeCloseTo(40 * 0.816, 5);
    expect(NEEDS.waterKg).toBeCloseTo(100, 5);
  });
});
