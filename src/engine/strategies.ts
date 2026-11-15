/**
 * Bot players used by the balance simulator and tests. They use only what a
 * human sees on screen (state + forecast), never hidden future events.
 */
import { NASA } from '../data/nasa';
import { CARGO, CARGO_ORDER, cargoMass, emptyLoadout, massBudget } from './cargo';
import { Rng } from './rng';
import { forecast, NEEDS, sunlitFraction, surfaceDoseRate } from './sim';
import { TUNING as T } from './tuning';
import type { CargoId, Decisions, GameState, Loadout, Planet } from './types';

export type StrategyId =
  | 'random'
  | 'naive'
  | 'thoughtful'
  | 'allPackagedFood'
  | 'greenhouseHeavy'
  | 'solarOnly'
  | 'fissionOnly'
  | 'heavyPrefabShield'
  | 'regolithOnly'
  | 'neverShelter'
  | 'alwaysShelter';

export const STRATEGIES: StrategyId[] = [
  'random', 'naive', 'thoughtful', 'allPackagedFood', 'greenhouseHeavy', 'solarOnly',
  'fissionOnly', 'heavyPrefabShield', 'regolithOnly', 'neverShelter', 'alwaysShelter',
];

/** Add crates in the given order (repeating) while they fit the budget. */
function fill(planet: Planet, base: Partial<Loadout>, topUp: CargoId[]): Loadout {
  const l = { ...emptyLoadout(), ...base };
  const budget = massBudget(planet);
  let added = true;
  while (added) {
    added = false;
    for (const id of topUp) {
      if (l[id] < CARGO[id].max && CARGO[id].planets.includes(planet) && cargoMass(l) + CARGO[id].massKg <= budget) {
        l[id] += 1;
        added = true;
      }
    }
  }
  // If the base itself is over budget, trim from the end of the order.
  while (cargoMass(l) > budget) {
    const id = [...CARGO_ORDER].reverse().find((k) => l[k] > 0)!;
    l[id] -= 1;
  }
  return l;
}

export function loadoutFor(strategy: StrategyId, planet: Planet, rng: Rng): Loadout {
  const mars = planet === 'mars';
  const sensible: Partial<Loadout> = mars
    ? { food: 20, water: 5, oxygen: 2, greenhouse: 1, solar: 5, battery: 1, fission: 1, shield: 0, moxie: 1 }
    : { food: 20, water: 6, oxygen: 2, greenhouse: 1, solar: 2, battery: 1, fission: 2, shield: 0 };
  switch (strategy) {
    case 'random': {
      const l = emptyLoadout();
      const ids = CARGO_ORDER.filter((id) => CARGO[id].planets.includes(planet));
      for (let tries = 0; tries < 400; tries++) {
        const id = rng.pick(ids);
        if (l[id] < CARGO[id].max && cargoMass(l) + CARGO[id].massKg <= massBudget(planet)) l[id] += 1;
      }
      return l;
    }
    case 'naive':
      return fill(planet, { food: 12, water: 4, oxygen: 2, greenhouse: 1, solar: 3, battery: 1, shield: 1 }, ['food', 'solar']);
    case 'thoughtful':
    case 'neverShelter':
    case 'alwaysShelter':
      return fill(planet, sensible, ['food', 'water', 'oxygen']);
    case 'allPackagedFood':
      return fill(planet, { ...sensible, food: 30, greenhouse: 0 }, ['water', 'shield', 'oxygen']);
    case 'greenhouseHeavy':
      return fill(planet, { ...sensible, greenhouse: 3, food: 10, solar: mars ? 6 : 3 }, ['food', 'water']);
    case 'solarOnly':
      return fill(planet, { ...sensible, fission: 0, solar: 10, battery: mars ? 2 : 4 }, ['food', 'battery', 'water']);
    case 'fissionOnly':
      return fill(planet, { ...sensible, solar: 0, fission: 3, battery: 0 }, ['food', 'water', 'shield']);
    case 'heavyPrefabShield':
      return fill(planet, { ...sensible, shield: 2, food: 18 }, ['food', 'water']);
    case 'regolithOnly':
      return fill(planet, { ...sensible, shield: 0 }, ['food', 'water', 'oxygen']); // plays: regolith before farming
  }
}

export function decide(strategy: StrategyId, state: GameState, rng: Rng): Decisions {
  if (strategy === 'random') {
    return {
      power: { lifeSupport: rng.next(), greenhouse: rng.next(), battery: rng.next() },
      crew: { maintenance: rng.next(), farming: rng.next(), regolith: rng.next() },
      spe: rng.chance(0.5) ? 'shelter' : 'work',
    };
  }
  if (strategy === 'naive') {
    return {
      power: { lifeSupport: 1, greenhouse: 1, battery: 1 },
      crew: { maintenance: 1, farming: 1, regolith: 1 },
      spe: 'shelter',
    };
  }
  return thoughtfulDecision(strategy, state);
}

function thoughtfulDecision(strategy: StrategyId, state: GameState): Decisions {
  const fc = forecast(state);
  const gen = fc.generationKWh;
  // Power: life support first (battery tops up shortfalls automatically).
  const nextDark = state.planet === 'moon' && sunlitFraction('moon', state.turn + 1) < 0.5;
  let left = gen;
  const ls = Math.min(left, fc.lifeSupportNeedKWh);
  left -= ls;
  let charge = 0;
  let gh = 0;
  if (nextDark) {
    charge = Math.min(left, fc.batteryRoomKWh / T.batteryEfficiency);
    left -= charge;
    gh = Math.min(left, fc.greenhouseNeedKWh);
    left -= gh;
  } else {
    gh = Math.min(left, fc.greenhouseNeedKWh);
    left -= gh;
    charge = Math.min(left, fc.batteryRoomKWh / T.batteryEfficiency);
    left -= charge;
  }
  // Spare power: keep it with life support (harmless) rather than wasting the split.
  const power = gen > 0 ? { lifeSupport: ls + left, greenhouse: gh, battery: charge } : { lifeSupport: 1, greenhouse: 0, battery: 0 };

  // Crew: maintenance, then farming, then regolith; regolith earlier if dose is the risk.
  const H = fc.crewHours;
  const remainingTurns = T.turns - state.turn;
  const projectedDose = state.dose + remainingTurns * surfaceDoseRate(state.planet) * T.daysPerTurn * (1 - state.shield);
  const doseRisk = projectedDose > NASA.careerDoseLimit.value * 0.8;
  const regolithAllowed = strategy !== 'heavyPrefabShield' || state.shield < T.maxShield;
  let hLeft = H;
  const maint = Math.min(hLeft, fc.maintenanceNeedHours);
  hLeft -= maint;
  let farm = 0;
  let reg = 0;
  const foodTurnsLeft = state.res.food / NEEDS.foodCrewDays;
  if (strategy === 'regolithOnly') {
    reg = hLeft;
    hLeft = 0;
  } else if (doseRisk && regolithAllowed && foodTurnsLeft > 3) {
    reg = Math.min(hLeft, H * 0.5);
    hLeft -= reg;
    farm = Math.min(hLeft, fc.farmingNeedHours);
    hLeft -= farm;
  } else {
    farm = Math.min(hLeft, fc.farmingNeedHours);
    hLeft -= farm;
  }
  reg += hLeft;
  let maintTotal = maint;
  if (state.shield >= T.maxShield) {
    maintTotal += reg; // nothing left to build: spare hours go to upkeep
    reg = 0;
  }

  let spe: Decisions['spe'] = 'shelter';
  if (strategy === 'neverShelter') spe = 'work';
  else if (strategy === 'alwaysShelter') spe = 'shelter';
  else if (state.events.spe) {
    const speDose = T.speDoseWorkingMSv[state.planet];
    const tightOnDose = projectedDose + speDose > NASA.careerDoseLimit.value * 0.85;
    const tightOnMaintenance = state.wear > 40 || state.events.failure !== null;
    spe = tightOnDose ? 'shelter' : tightOnMaintenance ? 'work' : 'shelter';
  }

  return { power, crew: { maintenance: maintTotal, farming: farm, regolith: reg }, spe };
}
