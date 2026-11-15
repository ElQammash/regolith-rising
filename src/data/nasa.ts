/**
 * Single source of truth for every real-world number used by the simulation.
 *
 * Rules:
 * - `value` is the figure exactly as the source states it (unit in `unit`).
 * - If the game uses a different number, it goes in `gameValue` and
 *   `simplified` is true. The UI must never show `gameValue` as a NASA figure.
 * - `verification` records how we checked the number:
 *     "primary"   - read in the original document/page
 *     "secondary" - confirmed via news coverage of the original; primary not opened
 *     "derived"   - computed by us from other entries (formula in `note`)
 * - `nasa` is false when the best available source is not NASA.
 *
 * Gameplay-only tuning knobs (not real data) live in src/engine/tuning.ts.
 */

export type Verification = 'primary' | 'secondary' | 'derived';

export interface DataEntry {
  value: number;
  unit: string;
  sourceName: string;
  sourceUrl: string;
  simplified: boolean;
  gameValue?: number;
  verification: Verification;
  nasa: boolean;
  note?: string;
}

const BVAD = {
  name: 'NASA Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570/REV1, 2018',
  url: 'https://ntrs.nasa.gov/citations/20180001338',
};
const MARS_FACTS = {
  name: 'NASA NSSDC Mars Fact Sheet (updated 19 May 2025)',
  url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
};
const MOON_FACTS = {
  name: 'NASA NSSDC Moon Fact Sheet (updated 11 Jan 2024)',
  url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html',
};

export const NASA = {
  // ---------- Crew consumables (BVAD Table 3-33, p. 63) ----------
  oxygenPerCrewDay: {
    value: 0.816, unit: 'kg/crew-day',
    sourceName: `${BVAD.name}, Table 3-33`, sourceUrl: BVAD.url,
    simplified: false, verification: 'primary', nasa: true,
    note: 'Nominal O2 consumed by an 82 kg crewmember. 0.84 appears in older references.',
  },
  co2PerCrewDay: {
    value: 1.04, unit: 'kg/crew-day',
    sourceName: `${BVAD.name}, Table 3-33`, sourceUrl: BVAD.url,
    simplified: false, verification: 'primary', nasa: true,
  },
  waterPerCrewDay: {
    value: 2.5, unit: 'kg/crew-day',
    sourceName: `${BVAD.name}, Table 3-33`, sourceUrl: BVAD.url,
    simplified: false, verification: 'primary', nasa: true,
    note: 'Potable water: drinking plus food/drink rehydration. Hygiene water is not included.',
  },
  foodPerCrewDay: {
    value: 1.51, unit: 'kg/crew-day',
    sourceName: `${BVAD.name}, Table 3-33`, sourceUrl: BVAD.url,
    simplified: false, verification: 'primary', nasa: true,
    note: 'Food mass without packaging, as shipped (contains ~0.7 kg water).',
  },
  packagedFoodPerCrewDay: {
    value: 1.83, unit: 'kg/crew-day',
    sourceName: `${BVAD.name}, section 4.3 (ISS food container, Perchonok et al. 2002)`, sourceUrl: BVAD.url,
    simplified: false, verification: 'primary', nasa: true,
    note: 'Loaded ISS food container mass per crew-day, including packaging. Later ISS use rose to 2.39.',
  },
  foodEnergyPerCrewDay: {
    value: 12.59, unit: 'MJ/crew-day',
    sourceName: `${BVAD.name}, Table 3-33`, sourceUrl: BVAD.url,
    simplified: false, verification: 'primary', nasa: true,
  },

  // ---------- Water recycling ----------
  issWaterRecovery: {
    value: 0.98, unit: 'fraction',
    sourceName: 'NASA: NASA Achieves Water Recovery Milestone on International Space Station (20 Jun 2023)',
    sourceUrl: 'https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/',
    simplified: false, verification: 'primary', nasa: true,
    note: 'Total recovery with the Brine Processor Assembly.',
  },
  issWaterRecoveryBeforeBPA: {
    value: 0.93, unit: 'fraction',
    sourceName: 'NASA: NASA Achieves Water Recovery Milestone on International Space Station (20 Jun 2023)',
    sourceUrl: 'https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/',
    simplified: false, verification: 'primary', nasa: true,
    note: 'NASA states 93-94% before the BPA; lower bound used.',
  },

  // ---------- Radiation ----------
  marsSurfaceDose: {
    value: 0.67, unit: 'mSv/day',
    sourceName: 'Hassler et al. 2014, Science 343, Curiosity RAD (NASA MSL)',
    sourceUrl: 'https://doi.org/10.1126/science.1244797',
    simplified: false, verification: 'secondary', nasa: true,
    note: 'GCR dose equivalent, Aug 2012-Jun 2013. Some reports give 0.64. Primary paper not opened.',
  },
  marsTransitDose: {
    value: 1.8, unit: 'mSv/day',
    sourceName: 'Zeitlin et al. 2013, Science 340, MSL RAD cruise measurements (NASA MSL)',
    sourceUrl: 'https://doi.org/10.1126/science.1235989',
    simplified: false, verification: 'secondary', nasa: true,
    note: 'Inside the cruise spacecraft. Also reported as 1.84. Primary paper not opened.',
  },
  marsTransitDays: {
    value: 180, unit: 'days',
    sourceName: 'Zeitlin et al. 2013 / Hassler et al. 2014 reference mission (180-day cruise)',
    sourceUrl: 'https://doi.org/10.1126/science.1244797',
    simplified: true, verification: 'secondary', nasa: true,
    note: 'Reference cruise length used to estimate the dose the crew carries on arrival.',
  },
  lunarSurfaceDose: {
    value: 1.369, unit: 'mSv/day',
    sourceName: 'Zhang et al. 2020, Science Advances 6, eaaz1334, Chang\'e 4 LND (CNSA / Univ. Kiel). NOT a NASA measurement',
    sourceUrl: 'https://doi.org/10.1126/sciadv.aaz1334',
    simplified: false, verification: 'secondary', nasa: false,
    note: 'First direct lunar-surface dose measurement (2019, quiet Sun). NASA has no surface measurement; LRO/CRaTER measured 0.22-0.27 mGy/day in orbit (absorbed dose, not comparable).',
  },
  careerDoseLimit: {
    value: 600, unit: 'mSv',
    sourceName: 'NASA-STD-3001, OCHMO Radiation Protection Technical Brief (Dec 2022)',
    sourceUrl: 'https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf',
    simplified: false, verification: 'secondary', nasa: true,
    note: 'Career effective dose limit, same for all ages and sexes.',
  },
  marsSolarStorm2024: {
    value: 8.1, unit: 'mGy (absorbed, single event)',
    sourceName: 'NASA: NASA Watches Mars Light Up During Epic Solar Storm (2024), Curiosity RAD, 20 May 2024',
    sourceUrl: 'https://www.nasa.gov/solar-system/planets/mars/nasa-watches-mars-light-up-during-epic-solar-storm',
    simplified: true, verification: 'secondary', nasa: true,
    note: 'Largest surge RAD recorded on the surface. Absorbed dose (mGy), not dose equivalent; the game treats it as an order-of-magnitude event size.',
  },

  // ---------- Sunlight and power ----------
  solarIrradianceMoon: {
    value: 1361.0, unit: 'W/m²',
    sourceName: MOON_FACTS.name, sourceUrl: MOON_FACTS.url,
    simplified: false, verification: 'primary', nasa: true,
    note: 'Same as at Earth\'s distance; no atmosphere to absorb it.',
  },
  solarIrradianceMars: {
    value: 586.2, unit: 'W/m²',
    sourceName: MARS_FACTS.name, sourceUrl: MARS_FACTS.url,
    simplified: false, verification: 'primary', nasa: true,
    note: 'Top of the atmosphere (ratio to Earth/Moon 0.431). Surface sunlight is lower because of dust.',
  },
  solarCellEfficiency: {
    value: 0.307, unit: 'fraction',
    sourceName: 'NASA APPEL: Astronauts Continue Space Station Power Upgrades (iROSA cells, 2021)',
    sourceUrl: 'https://appel.nasa.gov/2021/06/29/astronauts-continue-space-station-power-upgrades',
    simplified: false, verification: 'secondary', nasa: true,
    note: 'Beginning-of-life cell efficiency of ISS roll-out arrays (legacy: 14.2%).',
  },
  panelOutputMoonPeak: {
    value: 418, unit: 'W/m²',
    sourceName: 'Derived: solarIrradianceMoon × solarCellEfficiency',
    sourceUrl: MOON_FACTS.url,
    simplified: true, verification: 'derived', nasa: true,
    note: '1361 × 0.307 ≈ 418 W/m² of cell area in full sun, ignoring sun angle, packing and degradation. Not a published NASA figure.',
  },
  panelOutputMarsPeak: {
    value: 180, unit: 'W/m²',
    sourceName: 'Derived: solarIrradianceMars × solarCellEfficiency',
    sourceUrl: MARS_FACTS.url,
    simplified: true, verification: 'derived', nasa: true,
    note: '586.2 × 0.307 ≈ 180 W/m² before atmospheric dust losses. Not a published NASA figure.',
  },
  kilopowerOutput: {
    value: 1, unit: 'kWe',
    sourceName: 'NASA Kilopower / KRUSTY test (Gibson et al. 2018, NTRS 20180005435)',
    sourceUrl: 'https://ntrs.nasa.gov/citations/20180005435',
    simplified: false, verification: 'secondary', nasa: true,
    note: 'KRUSTY demonstrated the 1 kWe-class design; NASA describes the Kilopower family as 1-10 kWe.',
  },
  kilopowerMass: {
    value: 400, unit: 'kg',
    sourceName: 'NASA Fission Surface Power presentation, NETS 2023 (NTRS 20230006731)',
    sourceUrl: 'https://ntrs.nasa.gov/api/citations/20230006731/downloads/NETS%202023%20FSP%20Presentation%20FINAL.pdf',
    simplified: false, verification: 'secondary', nasa: true,
    note: 'Kilopower 1 kWe system listed at ~400 kg (400 kg/kWe). Read via search summary; slide not opened.',
  },

  // ---------- Mars oxygen (MOXIE) ----------
  moxiePeakRate: {
    value: 12, unit: 'g O2/hour',
    sourceName: 'NASA MOXIE end-of-mission results (Sep 2023), Perseverance',
    sourceUrl: 'https://www.jpl.nasa.gov/news/nasas-perseverance-mars-rover-extracts-first-oxygen-from-red-planet/',
    simplified: false, verification: 'secondary', nasa: true,
    note: 'Best rate, at ≥98% purity; twice the 6 g/h design goal. Total over 16 runs: 122 g. URL is the 2021 first-run release (5.4 g/h); the 2023 NASA article was seen via coverage only.',
  },
  moxieDesignRate: {
    value: 6, unit: 'g O2/hour',
    sourceName: 'NASA MOXIE design goal',
    sourceUrl: 'https://www.jpl.nasa.gov/news/nasas-perseverance-mars-rover-extracts-first-oxygen-from-red-planet/',
    simplified: false, verification: 'secondary', nasa: true,
  },
  marsAtmosphereCO2: {
    value: 0.951, unit: 'fraction by volume',
    sourceName: MARS_FACTS.name, sourceUrl: MARS_FACTS.url,
    simplified: false, verification: 'primary', nasa: true,
  },

  // ---------- Dust storm (2018 global storm) ----------
  dustStormTau2018: {
    value: 10.8, unit: 'optical depth (tau)',
    sourceName: 'NASA JPL: Opportunity Hunkers Down During Dust Storm (June 2018)',
    sourceUrl: 'https://www.jpl.nasa.gov/news/opportunity-hunkers-down-during-dust-storm/',
    simplified: false, verification: 'secondary', nasa: true,
    note: 'Last tau measured by Opportunity, 10 June 2018; a record.',
  },
  normalTauOpportunity: {
    value: 0.5, unit: 'optical depth (tau)',
    sourceName: 'NASA JPL: Opportunity Hunkers Down During Dust Storm (June 2018)',
    sourceUrl: 'https://www.jpl.nasa.gov/news/opportunity-hunkers-down-during-dust-storm/',
    simplified: false, verification: 'secondary', nasa: true,
    note: 'Typical tau at Opportunity\'s site.',
  },

  // ---------- Planetary physics ----------
  moonSynodicDays: {
    value: 29.53, unit: 'Earth days',
    sourceName: MOON_FACTS.name, sourceUrl: MOON_FACTS.url,
    simplified: false, verification: 'primary', nasa: true,
    note: 'One full day-night cycle at a non-polar site: ~14.8 days light, ~14.8 days dark.',
  },
  moonGravity: {
    value: 0.165, unit: '× Earth',
    sourceName: MOON_FACTS.name, sourceUrl: MOON_FACTS.url,
    simplified: false, verification: 'primary', nasa: true, note: '1.62 m/s²',
  },
  marsSolHours: {
    value: 24.6597, unit: 'hours',
    sourceName: MARS_FACTS.name, sourceUrl: MARS_FACTS.url,
    simplified: false, verification: 'primary', nasa: true, note: '24 h 39 min 35 s',
  },
  marsGravity: {
    value: 0.38, unit: '× Earth',
    sourceName: MARS_FACTS.name, sourceUrl: MARS_FACTS.url,
    simplified: false, verification: 'primary', nasa: true, note: '3.73 m/s² mean',
  },
  marsSurfacePressure: {
    value: 6.36, unit: 'mbar',
    sourceName: MARS_FACTS.name, sourceUrl: MARS_FACTS.url,
    simplified: false, verification: 'primary', nasa: true, note: 'Varies 4.0-8.7 mbar with season.',
  },

  // ---------- Crops (BVAD Table 4-97, p. 179; KSC Biomass Production Chamber) ----------
  cropLettuceEdibleFresh: {
    value: 131.35, unit: 'g fresh/m²/day',
    sourceName: `${BVAD.name}, Table 4-97`, sourceUrl: BVAD.url,
    simplified: false, verification: 'primary', nasa: true,
  },
  cropPotatoEdibleFresh: {
    value: 105.30, unit: 'g fresh/m²/day',
    sourceName: `${BVAD.name}, Table 4-97`, sourceUrl: BVAD.url,
    simplified: false, verification: 'primary', nasa: true, note: 'White potato; 21.06 g dry/m²/day.',
  },
  cropSweetPotatoEdibleFresh: {
    value: 51.72, unit: 'g fresh/m²/day',
    sourceName: `${BVAD.name}, Table 4-97`, sourceUrl: BVAD.url,
    simplified: false, verification: 'primary', nasa: true,
  },
  cropWheatEdibleFresh: {
    value: 22.73, unit: 'g fresh/m²/day',
    sourceName: `${BVAD.name}, Table 4-97`, sourceUrl: BVAD.url,
    simplified: false, verification: 'primary', nasa: true, note: '20.00 g dry/m²/day.',
  },
  packagedFoodShelfLife: {
    value: 3, unit: 'years',
    sourceName: 'NASA Human Research Program: Risk of Performance Decrement and Crew Illness Due to Inadequate Food and Nutrition',
    sourceUrl: 'https://www.nasa.gov/reference/risk-of-inadequate-food-and-nutrition/',
    simplified: true, verification: 'secondary', nasa: true,
    note: 'Key nutrients in many space foods degrade to concerning levels within ~3 years; fresh crops are a countermeasure. The game turns this into a small health drop after many turns with no fresh food.',
  },
  potatoEnergy: {
    value: 3.22, unit: 'MJ/kg fresh',
    sourceName: 'USDA FoodData Central, Potatoes, flesh and skin, raw (FDC 170026). NOT NASA',
    sourceUrl: 'https://fdc.nal.usda.gov/food-details/170026/nutrients',
    simplified: true, verification: 'secondary', nasa: false,
    note: '77 kcal/100 g (via USDA mirrors). Used to turn greenhouse harvest into crew-days of food; the game treats the whole harvest as potato-equivalent.',
  },
} as const satisfies Record<string, DataEntry>;

export type NasaKey = keyof typeof NASA;
