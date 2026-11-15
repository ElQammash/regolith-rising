/**
 * Gameplay tuning knobs. These are NOT NASA data: they are design choices made
 * so the game is playable in 30 turns, tuned with scripts/balance.ts.
 * Real figures live in src/data/nasa.ts and are referenced, never copied, here.
 */
export const TUNING = {
  crewSize: 4,
  turns: 30,
  daysPerTurn: 10,

  massBudgetKg: { moon: 4700, mars: 4600 },

  // Power demand
  lifeSupportKW: 2.0, // continuous electrical load of the life support system
  greenhouseKW: 1.5, // grow lights + pumps per greenhouse module
  moxieKW: 0.3, // per MOXIE-style unit, taken from the life support share

  // Power supply
  solarArrayM2: 12, // cell area per solar array crate
  solarSystemFactor: { moon: 0.55, mars: 0.3 }, // sun angle, packing, losses (Mars also averages the sol's night)
  dustExtinction: 0.35, // transmission = exp(-tau * k), simplified
  batteryKWh: 60,
  batteryEfficiency: 0.9,

  // Crew time
  workHoursPerCrewDay: 8,
  baseMaintenanceHours: 30, // habitat itself, per turn
  maintenanceHoursPerModule: 8, // per installed crate that can break
  farmHoursPerGreenhouse: 60,
  regolithHoursPerStep: 25,
  regolithShieldPerStep: 0.005,
  maxShield: 0.5,
  outdoorDoseFactor: 0.6, // regolith work is done outside: extra unshielded dose for that share of crew time

  // Greenhouse
  greenhouseAreaM2: 80,
  greenhouseRampTurns: 3, // first harvests take a few turns
  freshFoodHealthBonus: 1,
  noFreshFoodAfterTurn: 10, // packaged-only diet starts to wear on the crew (see packagedFoodShelfLife)
  noFreshFoodPenalty: 4,

  // Consumables handling
  electrolysisWaterPerKgO2: 1.125, // stoichiometry of water electrolysis (H2O -> O2 is 8/9 by mass)
  co2ReductionWaterRecovery: 0.5, // Sabatier-like loop gives back about half that water (simplified)
  moxieScale: 6, // a crew-sized unit is assumed ~6x MOXIE's best rate (simplified)

  // Starting state
  initialWaterKg: 0, // all water comes from cargo
  initialO2Kg: 0,

  // Health
  healthRecoveryPerTurn: 3,
  co2SafeLevel: 35,
  co2HealthFactor: 0.45,
  coldPenaltyBelowLsRatio: 0.85,
  coldPenalty: 6,

  // Events
  speChancePerTurn: 0.12,
  speDoseWorkingMSv: { moon: 120, mars: 35 },
  speShelterFactor: 0.3,
  dustStormChancePerTurn: 0.1,
  dustStormTau: [4, 7, 5, 2.5], // per-turn tau profile, a scaled-down 2018 storm (peak there: 10.8)
  normalTau: 0.5,
  failureBaseChance: 0.09,
  recyclerLeakKg: 110, // water lost when the recycler breaks, before repairs
  failureWearFactor: 0.006, // extra chance per wear point
  wearGainUnmaintained: 9,
  wearRecoveryMaintained: 5,

  // Stars
  // Dose thresholds are per planet: Mars crews arrive carrying ~324 mSv from the trip.
  star2: { minHealth: 55, maxDoseFrac: { moon: 0.7, mars: 0.88 } },
  star3: { minHealth: 75, maxDoseFrac: { moon: 0.55, mars: 0.8 }, minReserveTurns: 2 },
} as const;
