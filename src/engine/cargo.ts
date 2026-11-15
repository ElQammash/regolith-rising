import { NASA } from '../data/nasa';
import { TUNING } from './tuning';
import type { CargoId, Loadout, Planet } from './types';

export interface CargoSpec {
  id: CargoId;
  massKg: number; // per crate
  max: number;
  planets: Planet[];
  /** NASA data keys this crate's numbers come from (for the "source" button). */
  dataKeys: (keyof typeof NASA)[];
  /** True when the crate mass is a game value rather than a sourced figure. */
  massIsGameValue: boolean;
}

const foodCrateCrewDays = TUNING.crewSize * TUNING.daysPerTurn;

export const CARGO: Record<CargoId, CargoSpec> = {
  // One crate = one turn of packaged food for the whole crew (40 crew-days x 1.83 kg).
  food: { id: 'food', massKg: round1(foodCrateCrewDays * NASA.packagedFoodPerCrewDay.value), max: 30, planets: ['moon', 'mars'], dataKeys: ['packagedFoodPerCrewDay', 'foodEnergyPerCrewDay'], massIsGameValue: false },
  water: { id: 'water', massKg: 110, max: 20, planets: ['moon', 'mars'], dataKeys: ['waterPerCrewDay', 'issWaterRecovery'], massIsGameValue: true },
  oxygen: { id: 'oxygen', massKg: 85, max: 12, planets: ['moon', 'mars'], dataKeys: ['oxygenPerCrewDay'], massIsGameValue: true },
  greenhouse: { id: 'greenhouse', massKg: 450, max: 3, planets: ['moon', 'mars'], dataKeys: ['cropPotatoEdibleFresh', 'potatoEnergy'], massIsGameValue: true },
  solar: { id: 'solar', massKg: 120, max: 10, planets: ['moon', 'mars'], dataKeys: ['solarCellEfficiency', 'solarIrradianceMoon', 'solarIrradianceMars'], massIsGameValue: true },
  battery: { id: 'battery', massKg: 400, max: 8, planets: ['moon', 'mars'], dataKeys: [], massIsGameValue: true },
  fission: { id: 'fission', massKg: NASA.kilopowerMass.value, max: 3, planets: ['moon', 'mars'], dataKeys: ['kilopowerOutput', 'kilopowerMass'], massIsGameValue: false },
  shield: { id: 'shield', massKg: 500, max: 4, planets: ['moon', 'mars'], dataKeys: ['lunarSurfaceDose', 'marsSurfaceDose'], massIsGameValue: true },
  moxie: { id: 'moxie', massKg: 150, max: 2, planets: ['mars'], dataKeys: ['moxiePeakRate', 'marsAtmosphereCO2'], massIsGameValue: true },
};

/** Amount each crate provides, for display. */
export const CRATE_AMOUNT = {
  foodCrewDays: foodCrateCrewDays,
  waterKg: 100,
  oxygenKg: 50,
  shieldFraction: 0.1,
} as const;

export const CARGO_ORDER: CargoId[] = ['food', 'water', 'oxygen', 'greenhouse', 'solar', 'battery', 'fission', 'shield', 'moxie'];

export function emptyLoadout(): Loadout {
  return { food: 0, water: 0, oxygen: 0, greenhouse: 0, solar: 0, battery: 0, fission: 0, shield: 0, moxie: 0 };
}

export function cargoMass(loadout: Loadout): number {
  return round1(CARGO_ORDER.reduce((sum, id) => sum + loadout[id] * CARGO[id].massKg, 0));
}

export function massBudget(planet: Planet): number {
  return TUNING.massBudgetKg[planet];
}

export function validateLoadout(planet: Planet, loadout: Loadout): { ok: boolean; mass: number; budget: number; errors: string[] } {
  const errors: string[] = [];
  for (const id of CARGO_ORDER) {
    const n = loadout[id];
    if (!Number.isInteger(n) || n < 0) errors.push(`${id}: must be a whole number >= 0`);
    if (n > CARGO[id].max) errors.push(`${id}: max ${CARGO[id].max}`);
    if (n > 0 && !CARGO[id].planets.includes(planet)) errors.push(`${id}: not available on ${planet}`);
  }
  const mass = cargoMass(loadout);
  const budget = massBudget(planet);
  if (mass > budget) errors.push(`mass ${mass} kg exceeds budget ${budget} kg`);
  return { ok: errors.length === 0, mass, budget, errors };
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
