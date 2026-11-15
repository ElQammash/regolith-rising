import { NASA } from '../data/nasa';
import { CARGO, CRATE_AMOUNT, validateLoadout } from './cargo';
import { Rng } from './rng';
import { TUNING as T } from './tuning';
import type {
  Cause,
  Decisions,
  FailureKind,
  Forecast,
  GameState,
  Loadout,
  LossReason,
  Planet,
  TurnEvents,
  TurnRecord,
  TurnReport,
} from './types';

const HOURS_PER_TURN = T.daysPerTurn * 24;
const CREW_DAYS = T.crewSize * T.daysPerTurn;

/** Per-turn crew needs, straight from the NASA data file. */
export const NEEDS = {
  o2Kg: CREW_DAYS * NASA.oxygenPerCrewDay.value,
  waterKg: CREW_DAYS * NASA.waterPerCrewDay.value,
  foodCrewDays: CREW_DAYS,
};

export function surfaceDoseRate(planet: Planet): number {
  return planet === 'moon' ? NASA.lunarSurfaceDose.value : NASA.marsSurfaceDose.value;
}

export function transitDose(planet: Planet): number {
  return planet === 'mars' ? NASA.marsTransitDose.value * NASA.marsTransitDays.value : 0;
}

/**
 * Share of turn `turn` spent in sunlight. The Moon's day-night cycle is the
 * synodic month (29.53 days): about half light, half dark. The mission starts
 * at local sunrise. Mars has a normal day/night every sol, which is averaged
 * into the solar system factor, so every turn counts as fully "sunlit" here.
 */
export function sunlitFraction(planet: Planet, turn: number): number {
  if (planet === 'mars') return 1;
  const period = NASA.moonSynodicDays.value;
  const half = period / 2;
  const start = turn * T.daysPerTurn;
  const end = start + T.daysPerTurn;
  // Integrate exactly over light intervals [k*period, k*period + half).
  let light = 0;
  const firstCycle = Math.floor(start / period);
  const lastCycle = Math.floor(end / period);
  for (let k = firstCycle; k <= lastCycle; k++) {
    const a = Math.max(start, k * period);
    const b = Math.min(end, k * period + half);
    if (b > a) light += b - a;
  }
  return light / T.daysPerTurn;
}

function panelPeakWm2(planet: Planet): number {
  return planet === 'moon' ? NASA.panelOutputMoonPeak.value : NASA.panelOutputMarsPeak.value;
}

export function dustTransmission(tau: number): number {
  return Math.exp(-tau * T.dustExtinction);
}

export function maxShieldFromCargo(loadout: Loadout): number {
  return Math.min(T.maxShield, loadout.shield * CRATE_AMOUNT.shieldFraction);
}

function breakableCount(l: Loadout): number {
  return l.greenhouse + l.solar + l.battery + l.fission + l.moxie;
}

export function maintenanceNeedHours(l: Loadout): number {
  return T.baseMaintenanceHours + T.maintenanceHoursPerModule * breakableCount(l);
}

export function crewHoursAvailable(state: GameState): number {
  const base = T.crewSize * T.daysPerTurn * T.workHoursPerCrewDay;
  return base * (0.5 + state.health / 200);
}

export function forecast(state: GameState): Forecast {
  const { loadout: l, planet, events } = state;
  const tau = events.dustTau ?? (planet === 'mars' ? T.normalTau : 0);
  const transmission = planet === 'mars' ? dustTransmission(tau) : 1;
  let solarKWh =
    (l.solar * T.solarArrayM2 * panelPeakWm2(planet) * T.solarSystemFactor[planet] * transmission * events.sunlitFraction * HOURS_PER_TURN) / 1000;
  if (events.failure === 'solar') solarKWh *= 0.4;
  const fissionUnits = Math.max(0, l.fission - (events.failure === 'fission' ? 1 : 0));
  const fissionKWh = fissionUnits * NASA.kilopowerOutput.value * HOURS_PER_TURN;
  const lifeSupportNeedKWh = (T.lifeSupportKW + l.moxie * T.moxieKW) * HOURS_PER_TURN;
  const greenhouseNeedKWh = l.greenhouse * T.greenhouseKW * HOURS_PER_TURN;
  const capacity = l.battery * T.batteryKWh;
  const doseThisTurn = surfaceDoseRate(planet) * T.daysPerTurn * (1 - state.shield);
  return {
    generationKWh: solarKWh + fissionKWh,
    solarKWh,
    fissionKWh,
    lifeSupportNeedKWh,
    greenhouseNeedKWh,
    batteryRoomKWh: Math.max(0, capacity - state.res.batteryKWh),
    crewHours: crewHoursAvailable(state),
    maintenanceNeedHours: maintenanceNeedHours(l),
    farmingNeedHours: l.greenhouse * T.farmHoursPerGreenhouse,
    doseThisTurn,
  };
}

function rollEvents(state: GameState, rng: Rng): TurnEvents {
  const turn = state.turn;
  const events: TurnEvents = {
    spe: false,
    dustTau: null,
    dustStormStarted: false,
    failure: null,
    sunlitFraction: sunlitFraction(state.planet, turn),
  };
  const quiet = turn < 2; // a gentle start: no random events in the first two turns

  // Dust storm (Mars only), modelled on the 2018 global storm but scaled down.
  if (state.planet === 'mars') {
    if (state.dustStormStep >= 0) {
      state.dustStormStep += 1;
      if (state.dustStormStep >= T.dustStormTau.length) state.dustStormStep = -1;
    } else if (!quiet && !state.dustStormUsed && rng.chance(T.dustStormChancePerTurn)) {
      state.dustStormStep = 0;
      state.dustStormUsed = true;
      events.dustStormStarted = true;
    }
    if (state.dustStormStep >= 0) events.dustTau = T.dustStormTau[state.dustStormStep];
  }

  if (!quiet && rng.chance(T.speChancePerTurn)) events.spe = true;

  const failChance = T.failureBaseChance + state.wear * T.failureWearFactor;
  if (!quiet && rng.chance(failChance)) {
    const l = state.loadout;
    const kinds: FailureKind[] = ['recycler'];
    if (l.greenhouse > 0) kinds.push('greenhouse');
    if (l.solar > 0) kinds.push('solar');
    if (l.fission > 0) kinds.push('fission');
    if (l.battery > 0) kinds.push('battery');
    events.failure = rng.pick(kinds);
  }
  return events;
}

export function createMission(planet: Planet, loadout: Loadout, seed: number): GameState {
  const v = validateLoadout(planet, loadout);
  if (!v.ok) throw new Error(`Invalid loadout: ${v.errors.join('; ')}`);
  const state: GameState = {
    planet,
    loadout: { ...loadout },
    seed,
    rng: seed >>> 0,
    turn: 0,
    res: {
      o2: T.initialO2Kg + loadout.oxygen * CRATE_AMOUNT.oxygenKg,
      water: T.initialWaterKg + loadout.water * CRATE_AMOUNT.waterKg,
      food: loadout.food * CRATE_AMOUNT.foodCrewDays,
      batteryKWh: loadout.battery * T.batteryKWh, // batteries arrive charged
    },
    health: 100,
    dose: transitDose(planet),
    shield: maxShieldFromCargo(loadout),
    co2: 0,
    wear: 0,
    plantHealth: loadout.greenhouse > 0 ? 70 : 0,
    greenhouseAge: 0,
    dustStormUsed: false,
    dustStormStep: -1,
    events: { spe: false, dustTau: null, dustStormStarted: false, failure: null, sunlitFraction: 1 },
    status: 'playing',
    lossReason: null,
    history: [],
  };
  const rng = new Rng(state.rng);
  state.events = rollEvents(state, rng);
  state.rng = rng.state;
  return state;
}

function normalize<K extends string>(split: Record<K, number>): Record<K, number> {
  const keys = Object.keys(split) as K[];
  const clean = keys.map((k) => Math.max(0, Number.isFinite(split[k]) ? split[k] : 0));
  const total = clean.reduce((a, b) => a + b, 0);
  const out = {} as Record<K, number>;
  keys.forEach((k, i) => (out[k] = total > 0 ? clean[i] / total : 1 / keys.length));
  return out;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

function snapshot(state: GameState): GameState {
  return structuredClone({ ...state, history: [] });
}

export function resolveTurn(prev: GameState, decisions: Decisions): GameState {
  if (prev.status !== 'playing') throw new Error('Mission is over');
  const s: GameState = structuredClone({ ...prev, history: [] });
  const l = s.loadout;
  const ev = s.events;
  const fc = forecast(s);
  const power = normalize(decisions.power);
  const crew = normalize(decisions.crew);
  const speResponse = ev.spe ? decisions.spe ?? 'shelter' : undefined;
  const causes: Cause[] = [];
  const before = { ...s.res, health: s.health, dose: s.dose, shield: s.shield };

  // ---- Power ----
  const gen = fc.generationKWh;
  let lsEnergy = gen * power.lifeSupport;
  const ghEnergy = gen * power.greenhouse;
  const chargeEnergy = gen * power.battery;
  let battery = s.res.batteryKWh;
  let batteryUsed = 0;
  if (lsEnergy < fc.lifeSupportNeedKWh && ev.failure !== 'battery') {
    batteryUsed = Math.min(battery, fc.lifeSupportNeedKWh - lsEnergy);
    battery -= batteryUsed;
    lsEnergy += batteryUsed;
  }
  const capacity = l.battery * T.batteryKWh;
  battery = Math.min(capacity, battery + chargeEnergy * T.batteryEfficiency);
  const lsRatio = clamp(lsEnergy / fc.lifeSupportNeedKWh, 0, 1);
  const ghRatio = fc.greenhouseNeedKWh > 0 ? clamp(ghEnergy / fc.greenhouseNeedKWh, 0, 1) : 0;

  // ---- Crew time ----
  const hours = speResponse === 'shelter' ? 0 : fc.crewHours;
  const maintHours = hours * crew.maintenance;
  const farmHours = hours * crew.farming;
  const regolithHours = hours * crew.regolith;
  const maintRatio = clamp(maintHours / fc.maintenanceNeedHours, 0, 1);
  const farmRatio = fc.farmingNeedHours > 0 ? clamp(farmHours / fc.farmingNeedHours, 0, 1) : 0;
  const shieldGain = Math.min(T.maxShield - s.shield, (regolithHours / T.regolithHoursPerStep) * T.regolithShieldPerStep);
  const shieldBefore = s.shield;
  s.shield = clamp(s.shield + Math.max(0, shieldGain), 0, T.maxShield);

  s.wear = clamp(s.wear + T.wearGainUnmaintained * (1 - maintRatio) - T.wearRecoveryMaintained * maintRatio, 0, 100);
  const repair = 1 - 0.6 * maintRatio; // how much of a failure's effect remains after repairs

  // ---- Water and oxygen ----
  const recyclerFactor = ev.failure === 'recycler' ? 1 - 0.7 * repair : 1;
  const recovery = NASA.issWaterRecovery.value * lsRatio * recyclerFactor;
  let water = s.res.water - NEEDS.waterKg * (1 - recovery);
  if (ev.failure === 'recycler') water -= T.recyclerLeakKg * repair;

  const moxieO2 = s.planet === 'mars' ? l.moxie * (NASA.moxiePeakRate.value / 1000) * T.moxieScale * HOURS_PER_TURN * lsRatio : 0;
  let electrolysisO2 = Math.max(0, NEEDS.o2Kg - moxieO2) * lsRatio;
  const waterPerO2 = T.electrolysisWaterPerKgO2 * (1 - T.co2ReductionWaterRecovery);
  if (water < electrolysisO2 * waterPerO2) electrolysisO2 = Math.max(0, water / waterPerO2);
  water -= electrolysisO2 * waterPerO2;
  const o2 = s.res.o2 + moxieO2 + electrolysisO2 - NEEDS.o2Kg;

  const co2Before = s.co2;
  s.co2 = clamp(s.co2 + (1 - lsRatio) * 70 - (lsRatio >= 0.95 ? 30 : 0), 0, 100);

  // ---- Food ----
  let harvest = 0;
  if (l.greenhouse > 0) {
    const care = Math.min(ghRatio, farmRatio);
    s.plantHealth = clamp(s.plantHealth + (care * 100 - s.plantHealth) * 0.6 - (care < 0.3 ? 15 : 0), 0, 100);
    const ramp = Math.min(1, (s.greenhouseAge + 1) / (T.greenhouseRampTurns + 1));
    const perModule =
      (T.greenhouseAreaM2 * NASA.cropPotatoEdibleFresh.value * T.daysPerTurn * NASA.potatoEnergy.value) /
      1000 /
      NASA.foodEnergyPerCrewDay.value;
    const failureFactor = ev.failure === 'greenhouse' ? 1 - repair : 1;
    harvest = l.greenhouse * perModule * Math.min(ramp, 1) * (s.plantHealth / 100) * failureFactor;
    s.greenhouseAge += 1;
  }
  const food = s.res.food + harvest - NEEDS.foodCrewDays;

  // ---- Radiation ----
  let dose = fc.doseThisTurn;
  const outdoorShare = hours > 0 ? regolithHours / hours : 0;
  dose += surfaceDoseRate(s.planet) * T.daysPerTurn * outdoorShare * T.outdoorDoseFactor * shieldBefore;
  if (ev.spe) {
    const speDose = T.speDoseWorkingMSv[s.planet];
    dose += speResponse === 'work' ? speDose * (1 - shieldBefore * 0.3) : speDose * T.speShelterFactor * (1 - shieldBefore);
  }
  s.dose += dose;

  // ---- Health ----
  let dh = 0;
  if (lsRatio >= 0.95 && s.co2 < T.co2SafeLevel) dh += T.healthRecoveryPerTurn;
  dh -= Math.max(0, s.co2 - T.co2SafeLevel) * T.co2HealthFactor;
  if (lsRatio < T.coldPenaltyBelowLsRatio) dh -= T.coldPenalty * (1 - lsRatio) / (1 - T.coldPenaltyBelowLsRatio + 0.0001) * 0.5;
  if (harvest >= 4) dh += T.freshFoodHealthBonus;
  else if (prev.turn >= T.noFreshFoodAfterTurn) dh -= T.noFreshFoodPenalty;
  if (ev.spe && speResponse === 'work') dh -= 3;
  s.health = clamp(s.health + dh, 0, 100);

  // ---- Commit resources ----
  s.res = { o2: Math.max(0, o2), water: Math.max(0, water), food: Math.max(0, food), batteryKWh: battery };

  // ---- Outcome ----
  let loss: LossReason | null = null;
  if (s.dose > NASA.careerDoseLimit.value) loss = 'radiation';
  else if (o2 < 0) loss = 'oxygen';
  else if (water < 0) loss = 'water';
  else if (food < 0) loss = 'food';
  else if (s.health <= 0) loss = 'health';

  // ---- Report: why things changed ----
  if (ev.dustTau !== null) causes.push({ key: 'dustStorm', params: { tau: ev.dustTau } });
  if (s.planet === 'moon' && ev.sunlitFraction < 0.5) causes.push({ key: 'lunarNight', params: { light: Math.round(ev.sunlitFraction * 100) } });
  if (ev.failure) causes.push({ key: 'failure', params: { kind: ev.failure } });
  if (ev.spe) causes.push({ key: speResponse === 'work' ? 'speWorked' : 'speSheltered', params: { dose: round(dose, 1) } });
  if (lsRatio < 0.95) {
    causes.push({ key: 'lsUnderpowered', params: { pct: Math.round(lsRatio * 100) } });
    if (recovery < 0.9) causes.push({ key: 'waterRecoveryLow', params: { pct: Math.round(recovery * 100) } });
    if (s.co2 > co2Before) causes.push({ key: 'co2Rising', params: { level: Math.round(s.co2) } });
  } else if (co2Before > 0 && s.co2 < co2Before) causes.push({ key: 'co2Cleared' });
  if (batteryUsed > 0 && lsRatio >= 0.95) causes.push({ key: 'batteryCovered', params: { kwh: Math.round(batteryUsed) } });
  if (batteryUsed > 0 && battery <= 0.5 && lsRatio < 0.95) causes.push({ key: 'batteryEmpty' });
  if (l.greenhouse > 0) {
    if (s.greenhouseAge <= T.greenhouseRampTurns) causes.push({ key: 'greenhouseYoung', params: { food: round(harvest, 1) } });
    else if (Math.min(ghRatio, farmRatio) < 0.7) causes.push({ key: 'greenhouseWilting', params: { power: Math.round(ghRatio * 100), care: Math.round(farmRatio * 100) } });
    else causes.push({ key: 'greenhouseThriving', params: { food: round(harvest, 1) } });
  }
  if (shieldGain > 0.005) causes.push({ key: 'shieldBuilt', params: { pct: Math.round(s.shield * 100) } });
  if (s.res.food < NEEDS.foodCrewDays * 2) causes.push({ key: 'foodLow', params: { turns: round(s.res.food / NEEDS.foodCrewDays, 1) } });
  if (s.res.water < 60) causes.push({ key: 'waterLow', params: { kg: Math.round(s.res.water) } });
  if (s.res.o2 < NEEDS.o2Kg) causes.push({ key: 'o2Low', params: { kg: Math.round(s.res.o2) } });
  if (s.dose > NASA.careerDoseLimit.value * 0.8) causes.push({ key: 'doseHigh', params: { dose: Math.round(s.dose) } });
  if (causes.length === 0) causes.push({ key: 'allGood' });

  const report: TurnReport = {
    turn: prev.turn,
    causes,
    factKey: pickFact(s.planet, causes),
    delta: {
      o2: s.res.o2 - before.o2,
      water: s.res.water - before.water,
      food: s.res.food - before.food,
      battery: s.res.batteryKWh - before.batteryKWh,
      health: s.health - before.health,
      dose,
      shield: s.shield - before.shield,
    },
  };

  const record: TurnRecord = {
    turn: prev.turn,
    before: snapshot(prev),
    decisions: { power, crew, spe: speResponse },
    events: ev,
    forecast: fc,
    lsRatio,
    greenhouseRatio: ghRatio,
    farmRatio,
    maintRatio,
    regolithHours,
    report,
    after: { res: { ...s.res }, health: s.health, dose: s.dose, shield: s.shield, co2: s.co2, plantHealth: s.plantHealth, wear: s.wear },
  };
  s.history = [...prev.history, record];

  if (loss) {
    s.status = 'lost';
    s.lossReason = loss;
    return s;
  }
  s.turn += 1;
  if (s.turn >= T.turns) {
    s.status = 'won';
    return s;
  }
  const rng = new Rng(s.rng);
  s.events = rollEvents(s, rng);
  s.rng = rng.state;
  return s;
}

/** Fact card shown with the report, chosen from what just happened. */
function pickFact(planet: Planet, causes: Cause[]): string {
  const keys = causes.map((c) => c.key);
  if (keys.includes('dustStorm')) return 'dustStorm2018';
  if (keys.includes('lunarNight')) return 'lunarNight';
  if (keys.includes('speWorked') || keys.includes('speSheltered')) return planet === 'mars' ? 'speMars2024' : 'speMoon';
  if (keys.includes('waterRecoveryLow') || keys.includes('waterLow')) return 'issWater';
  if (keys.includes('co2Rising') || keys.includes('lsUnderpowered')) return 'co2';
  if (keys.includes('o2Low')) return planet === 'mars' ? 'moxie' : 'oxygen';
  if (keys.includes('greenhouseWilting') || keys.includes('greenhouseThriving') || keys.includes('greenhouseYoung')) return 'crops';
  if (keys.includes('shieldBuilt')) return planet === 'mars' ? 'marsRadiation' : 'moonRadiation';
  if (keys.includes('failure')) return 'maintenance';
  if (keys.includes('foodLow')) return 'food';
  if (keys.includes('doseHigh')) return 'doseLimit';
  const rotation = planet === 'mars' ? ['marsSun', 'marsGravity', 'marsRadiation', 'moxie'] : ['moonSun', 'moonGravity', 'moonRadiation', 'kilopower'];
  return rotation[causes.length % rotation.length];
}

function round(x: number, d: number): number {
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

export function starsFor(state: GameState): 0 | 1 | 2 | 3 {
  if (state.status !== 'won') return 0;
  const limit = NASA.careerDoseLimit.value;
  const reserveTurns = Math.min(state.res.food / NEEDS.foodCrewDays, state.res.water / 50, (state.res.o2 + 1) / 20);
  if (state.health >= T.star3.minHealth && state.dose <= limit * T.star3.maxDoseFrac[state.planet] && reserveTurns >= T.star3.minReserveTurns) return 3;
  if (state.health >= T.star2.minHealth && state.dose <= limit * T.star2.maxDoseFrac[state.planet]) return 2;
  return 1;
}

/** Restart from the start of `turn`, with the same events as before. */
export function retryFromTurn(state: GameState, turn: number): GameState {
  const rec = state.history[turn];
  if (!rec) throw new Error(`No record for turn ${turn}`);
  return { ...structuredClone(rec.before), history: state.history.slice(0, turn) };
}

export { CARGO };
