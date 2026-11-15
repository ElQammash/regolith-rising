# Regolith Rising 🪐

**A junior astronaut mission trainer by Team AstraQuest for the NASA Space Apps Challenge 2026.**

Command a 4-person outpost on the Moon or Mars for 300 days. Pack a rocket with a fixed mass limit, split scarce power and crew time every 10 days, and get through solar storms, dust storms, lunar nights and broken equipment. Every number comes from a sourced NASA data file, and the game says openly what was simplified.

- 🎮 Play: `https://<your-domain>/` (installable PWA, works offline)
- 🌍 Arabic and English, with a full right-to-left layout
- 📄 Full project documentation: [docs/PROJECT.md](docs/PROJECT.md) (PDF: [docs/PROJECT.pdf](docs/PROJECT.pdf))
- 🧭 Product requirements: [docs/PRD.md](docs/PRD.md)
- 🚀 Hostinger upload steps: [docs/DEPLOY.md](docs/DEPLOY.md)
- 📝 Space Apps submission text: [docs/SUBMISSION.md](docs/SUBMISSION.md)

## Run it locally

```bash
npm ci
npm run dev        # play at http://localhost:5173
npm test           # 27 unit tests (engine, data file, translations)
npm run balance    # play 2,000 simulated missions per strategy and print win rates
npm run build      # production build in dist/
```

## Project layout

```
src/data/nasa.ts      every real-world number, with source + URL + "simplified" flag
src/engine/           pure TypeScript simulation (no UI), seeded and deterministic
src/i18n/             all text: en.ts, ar.ts
src/ui/               React screens, SVG outpost scene, gauges, sound, saves
scripts/balance.ts    headless balance simulator
public/api/           optional PHP cloud save (SQLite by default, MySQL optional)
```

## Balance (2,000 missions per strategy per planet)

| Strategy | Moon | Mars |
|---|---|---|
| Random player | 0.0% | 0.0% |
| Thoughtful player | 96.9% | 83.2% |
| Best fixed build | 94.7% | 89.3% (mostly 1 star) |

Details are in [docs/PROJECT.md](docs/PROJECT.md#7-balance-tested-with-thousands-of-simulated-missions).

## Data sources

Every value below is used by the simulation and shown in the game behind a "Source" button. Flags: **primary** = read in the original document, **secondary** = confirmed through reports of the original, **derived** = calculated by us (the formula is in the notes), **simplified** = adjusted or interpreted for gameplay, **not NASA** = the best available source is not NASA.

Regenerate this table with `npx tsx scripts/sources-table.ts`.

| Key | Value | Source | Flags | Notes |
|---|---|---|---|---|
| `oxygenPerCrewDay` | 0.816 kg/crew-day | [NASA Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570/REV1, 2018, Table 3-33](https://ntrs.nasa.gov/citations/20180001338) | primary | Nominal O2 consumed by an 82 kg crewmember. 0.84 appears in older references. |
| `co2PerCrewDay` | 1.04 kg/crew-day | [NASA Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570/REV1, 2018, Table 3-33](https://ntrs.nasa.gov/citations/20180001338) | primary |  |
| `waterPerCrewDay` | 2.5 kg/crew-day | [NASA Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570/REV1, 2018, Table 3-33](https://ntrs.nasa.gov/citations/20180001338) | primary | Potable water: drinking plus food/drink rehydration. Hygiene water is not included. |
| `foodPerCrewDay` | 1.51 kg/crew-day | [NASA Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570/REV1, 2018, Table 3-33](https://ntrs.nasa.gov/citations/20180001338) | primary | Food mass without packaging, as shipped (contains ~0.7 kg water). |
| `packagedFoodPerCrewDay` | 1.83 kg/crew-day | [NASA Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570/REV1, 2018, section 4.3 (ISS food container, Perchonok et al. 2002)](https://ntrs.nasa.gov/citations/20180001338) | primary | Loaded ISS food container mass per crew-day, including packaging. Later ISS use rose to 2.39. |
| `foodEnergyPerCrewDay` | 12.59 MJ/crew-day | [NASA Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570/REV1, 2018, Table 3-33](https://ntrs.nasa.gov/citations/20180001338) | primary |  |
| `issWaterRecovery` | 0.98 fraction | [NASA: NASA Achieves Water Recovery Milestone on International Space Station (20 Jun 2023)](https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/) | primary | Total recovery with the Brine Processor Assembly. |
| `issWaterRecoveryBeforeBPA` | 0.93 fraction | [NASA: NASA Achieves Water Recovery Milestone on International Space Station (20 Jun 2023)](https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/) | primary | NASA states 93-94% before the BPA; lower bound used. |
| `marsSurfaceDose` | 0.67 mSv/day | [Hassler et al. 2014, Science 343, Curiosity RAD (NASA MSL)](https://doi.org/10.1126/science.1244797) | secondary | GCR dose equivalent, Aug 2012-Jun 2013. Some reports give 0.64. Primary paper not opened. |
| `marsTransitDose` | 1.8 mSv/day | [Zeitlin et al. 2013, Science 340, MSL RAD cruise measurements (NASA MSL)](https://doi.org/10.1126/science.1235989) | secondary | Inside the cruise spacecraft. Also reported as 1.84. Primary paper not opened. |
| `marsTransitDays` | 180 days | [Zeitlin et al. 2013 / Hassler et al. 2014 reference mission (180-day cruise)](https://doi.org/10.1126/science.1244797) | simplified, secondary | Reference cruise length used to estimate the dose the crew carries on arrival. |
| `lunarSurfaceDose` | 1.369 mSv/day | [Zhang et al. 2020, Science Advances 6, eaaz1334, Chang'e 4 LND (CNSA / Univ. Kiel). NOT a NASA measurement](https://doi.org/10.1126/sciadv.aaz1334) | secondary, **not NASA** | First direct lunar-surface dose measurement (2019, quiet Sun). NASA has no surface measurement; LRO/CRaTER measured 0.22-0.27 mGy/day in orbit (absorbed dose, not comparable). |
| `careerDoseLimit` | 600 mSv | [NASA-STD-3001, OCHMO Radiation Protection Technical Brief (Dec 2022)](https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf) | secondary | Career effective dose limit, same for all ages and sexes. |
| `marsSolarStorm2024` | 8.1 mGy (absorbed, single event) | [NASA: NASA Watches Mars Light Up During Epic Solar Storm (2024), Curiosity RAD, 20 May 2024](https://www.nasa.gov/solar-system/planets/mars/nasa-watches-mars-light-up-during-epic-solar-storm) | simplified, secondary | Largest surge RAD recorded on the surface. Absorbed dose (mGy), not dose equivalent; the game treats it as an order-of-magnitude event size. |
| `solarIrradianceMoon` | 1361 W/m² | [NASA NSSDC Moon Fact Sheet (updated 11 Jan 2024)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) | primary | Same as at Earth's distance; no atmosphere to absorb it. |
| `solarIrradianceMars` | 586.2 W/m² | [NASA NSSDC Mars Fact Sheet (updated 19 May 2025)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | primary | Top of the atmosphere (ratio to Earth/Moon 0.431). Surface sunlight is lower because of dust. |
| `solarCellEfficiency` | 0.307 fraction | [NASA APPEL: Astronauts Continue Space Station Power Upgrades (iROSA cells, 2021)](https://appel.nasa.gov/2021/06/29/astronauts-continue-space-station-power-upgrades) | secondary | Beginning-of-life cell efficiency of ISS roll-out arrays (legacy: 14.2%). |
| `panelOutputMoonPeak` | 418 W/m² | [Derived: solarIrradianceMoon × solarCellEfficiency](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) | simplified, derived | 1361 × 0.307 ≈ 418 W/m² of cell area in full sun, ignoring sun angle, packing and degradation. Not a published NASA figure. |
| `panelOutputMarsPeak` | 180 W/m² | [Derived: solarIrradianceMars × solarCellEfficiency](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | simplified, derived | 586.2 × 0.307 ≈ 180 W/m² before atmospheric dust losses. Not a published NASA figure. |
| `kilopowerOutput` | 1 kWe | [NASA Kilopower / KRUSTY test (Gibson et al. 2018, NTRS 20180005435)](https://ntrs.nasa.gov/citations/20180005435) | secondary | KRUSTY demonstrated the 1 kWe-class design; NASA describes the Kilopower family as 1-10 kWe. |
| `kilopowerMass` | 400 kg | [NASA Fission Surface Power presentation, NETS 2023 (NTRS 20230006731)](https://ntrs.nasa.gov/api/citations/20230006731/downloads/NETS%202023%20FSP%20Presentation%20FINAL.pdf) | secondary | Kilopower 1 kWe system listed at ~400 kg (400 kg/kWe). Read via search summary; slide not opened. |
| `moxiePeakRate` | 12 g O2/hour | [NASA MOXIE end-of-mission results (Sep 2023), Perseverance](https://www.jpl.nasa.gov/news/nasas-perseverance-mars-rover-extracts-first-oxygen-from-red-planet/) | secondary | Best rate, at ≥98% purity; twice the 6 g/h design goal. Total over 16 runs: 122 g. URL is the 2021 first-run release (5.4 g/h); the 2023 NASA article was seen via coverage only. |
| `moxieDesignRate` | 6 g O2/hour | [NASA MOXIE design goal](https://www.jpl.nasa.gov/news/nasas-perseverance-mars-rover-extracts-first-oxygen-from-red-planet/) | secondary |  |
| `marsAtmosphereCO2` | 0.951 fraction by volume | [NASA NSSDC Mars Fact Sheet (updated 19 May 2025)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | primary |  |
| `dustStormTau2018` | 10.8 optical depth (tau) | [NASA JPL: Opportunity Hunkers Down During Dust Storm (June 2018)](https://www.jpl.nasa.gov/news/opportunity-hunkers-down-during-dust-storm/) | secondary | Last tau measured by Opportunity, 10 June 2018; a record. |
| `normalTauOpportunity` | 0.5 optical depth (tau) | [NASA JPL: Opportunity Hunkers Down During Dust Storm (June 2018)](https://www.jpl.nasa.gov/news/opportunity-hunkers-down-during-dust-storm/) | secondary | Typical tau at Opportunity's site. |
| `moonSynodicDays` | 29.53 Earth days | [NASA NSSDC Moon Fact Sheet (updated 11 Jan 2024)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) | primary | One full day-night cycle at a non-polar site: ~14.8 days light, ~14.8 days dark. |
| `moonGravity` | 0.165 × Earth | [NASA NSSDC Moon Fact Sheet (updated 11 Jan 2024)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) | primary | 1.62 m/s² |
| `marsSolHours` | 24.6597 hours | [NASA NSSDC Mars Fact Sheet (updated 19 May 2025)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | primary | 24 h 39 min 35 s |
| `marsGravity` | 0.38 × Earth | [NASA NSSDC Mars Fact Sheet (updated 19 May 2025)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | primary | 3.73 m/s² mean |
| `marsSurfacePressure` | 6.36 mbar | [NASA NSSDC Mars Fact Sheet (updated 19 May 2025)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | primary | Varies 4.0-8.7 mbar with season. |
| `cropLettuceEdibleFresh` | 131.35 g fresh/m²/day | [NASA Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570/REV1, 2018, Table 4-97](https://ntrs.nasa.gov/citations/20180001338) | primary |  |
| `cropPotatoEdibleFresh` | 105.3 g fresh/m²/day | [NASA Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570/REV1, 2018, Table 4-97](https://ntrs.nasa.gov/citations/20180001338) | primary | White potato; 21.06 g dry/m²/day. |
| `cropSweetPotatoEdibleFresh` | 51.72 g fresh/m²/day | [NASA Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570/REV1, 2018, Table 4-97](https://ntrs.nasa.gov/citations/20180001338) | primary |  |
| `cropWheatEdibleFresh` | 22.73 g fresh/m²/day | [NASA Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570/REV1, 2018, Table 4-97](https://ntrs.nasa.gov/citations/20180001338) | primary | 20.00 g dry/m²/day. |
| `packagedFoodShelfLife` | 3 years | [NASA Human Research Program: Risk of Performance Decrement and Crew Illness Due to Inadequate Food and Nutrition](https://www.nasa.gov/reference/risk-of-inadequate-food-and-nutrition/) | simplified, secondary | Key nutrients in many space foods degrade to concerning levels within ~3 years; fresh crops are a countermeasure. The game turns this into a small health drop after many turns with no fresh food. |
| `potatoEnergy` | 3.22 MJ/kg fresh | [USDA FoodData Central, Potatoes, flesh and skin, raw (FDC 170026). NOT NASA](https://fdc.nal.usda.gov/food-details/170026/nutrients) | simplified, secondary, **not NASA** | 77 kcal/100 g (via USDA mirrors). Used to turn greenhouse harvest into crew-days of food; the game treats the whole harvest as potato-equivalent. |

Gameplay-only values (crate masses, power draw, event chances and similar) are **not** NASA data. They live in [`src/engine/tuning.ts`](src/engine/tuning.ts) and were tuned with the balance simulator.

## Built with

[React](https://react.dev) · [TypeScript](https://www.typescriptlang.org) · [Vite](https://vite.dev) · [vite-plugin-pwa](https://vite-pwa-org.netlify.app) · [Vitest](https://vitest.dev) · [tsx](https://tsx.is) · Web Audio API · PHP 8 + SQLite. AI assistance: [Claude Code](https://claude.com/claude-code) (see [docs/PROJECT.md §10](docs/PROJECT.md#10-how-we-used-ai-tools)).
