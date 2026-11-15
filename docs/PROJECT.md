# Regolith Rising: Project Documentation

**Team:** AstraQuest
**Event:** NASA Space Apps Challenge 2026
**Challenge:** Build a Junior Astronaut Mission Trainer
**Play:** `https://mistyrose-eland-246079.hostingersite.com/` (installable, works offline)
**Code:** https://github.com/ElQammash/regolith-rising

---

## 1. The idea in one paragraph

Regolith Rising is a game for players aged 10 to 14. You command a 4-person outpost on the Moon or on Mars for 30 turns of 10 days each, which makes 300 days in total. First you pack a rocket that has a fixed mass limit. Then, every turn, you split two scarce resources: electrical power and crew hours. Solar storms, dust storms, lunar nights and broken equipment test your plan. When the mission ends, a debrief shows the one decision that saved or doomed the crew, and you can retry from that exact turn. All 37 real-world numbers come from one sourced data file. Each one has a "Source" button in the game, and the game says openly when a number was simplified for play.

## 2. How it answers the challenge

| What the judges look for | How Regolith Rising delivers it |
|---|---|
| **Trade-offs you feel through play, not read about** | One mass budget forces real choices: packaged food vs. a greenhouse, solar panels vs. batteries vs. a fission reactor, heavy prefab shielding vs. regolith piled by the crew. Every turn, giving power or hours to one system takes them from another. The scene shows the result at once: windows dim, plants wilt, CO₂ haze appears, regolith piles up on the roof. |
| **Real NASA data** | 37 sourced values from the NASA BVAD, Curiosity RAD, MOXIE, Kilopower, ISS ECLSS, the NASA fact sheets and the 2018 dust storm. Each value is checked against its source and labelled *primary*, *secondary* or *derived*. Simplified and non-NASA values are flagged in the UI. |
| **A 10–14 year old can play without instructions** | A guided first mission with one short tip at a time. Power and crew time are split into 10 "blocks" with +/− buttons, and a yellow marker shows how many blocks each system needs. Gauges turn yellow before they turn red. Everything is in Arabic (full RTL) and English. |

## 3. How to play

1. **Pack the rocket.** The Moon allows 4,700 kg and Mars 4,600 kg. Each crate has a mass, and the mass bar shows what is left. A "safe starter cargo" button helps first-time players.
2. **Plan each turn.**
   - *Power:* split 10 blocks between life support, the greenhouse and charging the battery. If life support is short, the battery covers the gap automatically, until it runs out.
   - *Crew time:* split 10 blocks between maintenance, farming and piling regolith.
3. **React to events.**
   - Solar storm: shelter (safe, but the turn's work is lost) or keep working (take the dose).
   - Dust storm (Mars only): solar output collapses for several turns.
   - Lunar night (Moon only): about two of every three turns are partly or fully dark.
   - Equipment failures: more likely when maintenance is skipped.
4. **End the turn.** Ten days pass in the scene (a day counter, the sun moving, Mars sols flicking by), then a report explains in one or two sentences what changed and why, with a NASA fact card about what just happened.
5. **Debrief.** A timeline, a supplies chart and the decisive decision, e.g. *"Turn 6: you cut greenhouse power to 20%. Food ran out 9 turns later."* One button retries from that turn, with the same events.

**You lose if** oxygen, water or food runs out, crew health reaches 0, or the cumulative dose passes NASA's 600 mSv career limit. **You win by** surviving 30 turns, and earn 1 to 3 stars for crew health, dose received and supplies left.

## 4. The Moon and Mars are different worlds, not different skins

| | Moon | Mars |
|---|---|---|
| Day/night | 29.53-day synodic month. The sunlit share of each 10-day turn is computed exactly, so long nights come in a fixed rhythm | 24 h 39 min sol, averaged into solar output |
| Sunlight | 1361 W/m² | 586.2 W/m² (43%), reduced further by dust (optical depth τ) |
| Dust storms | None (no atmosphere) | Yes, modelled on the 2018 global storm |
| Oxygen from the air | Impossible | Optional MOXIE-style unit (saves water) |
| Surface radiation | 1.369 mSv/day (Chang'e 4, the only surface measurement; flagged as non-NASA) | 0.67 mSv/day (Curiosity RAD) |
| Arrival dose | ~0 | 324 mSv already carried from the trip (1.8 mSv/day × 180 days) |
| Solar storms | Harsher (no atmosphere): 120 mSv if working outside | 35 mSv if working outside |

## 5. Design decisions (and why)

- **Cargo is the biggest decision.** It is made once, before any feedback, and everything after depends on it, just as in real mission planning.
- **Blocks instead of sliders.** Splitting 10 blocks is concrete for a 10-year-old, and the "need" marker teaches the idea of a power budget without any text.
- **Batteries cover life support automatically.** This shows what batteries are for. On the Moon, the player discovers that a full lunar night needs far more storage than a battery crate holds, which is the real argument for fission surface power.
- **Regolith shielding costs crew time and some outdoor dose; prefab shielding costs mass.** This is the real trade-off between in-situ resources and launched mass.
- **Packaged food is reliable but does not stay nutritious forever.** NASA's Human Research Program warns that key nutrients degrade within about 3 years. In the game, crews with no fresh food slowly lose health after turn 10. That makes the greenhouse worth its power and farming time.
- **Explain causes, not just results.** The engine tags each change with a reason (e.g. `lsUnderpowered → waterRecoveryLow`), and the report shows the top two. The debrief separates *choices* from *bad luck*: a greenhouse that wilted at night is not blamed on the player, but one that lost power the player gave to something else is.
- **Animation only where it explains cause and effect.** Windows dim with life-support power, plants wilt with care, regolith grows with shielding, the sky changes with events. Nothing moves just to decorate.

## 6. NASA data and honesty about simplifications

Every number lives in [`src/data/nasa.ts`](../src/data/nasa.ts) with `value`, `unit`, `sourceName`, `sourceUrl`, `simplified`, `verification` (primary / secondary / derived), `nasa` (true/false) and a `note`. Gameplay-only knobs, which are not real data, live separately in [`src/engine/tuning.ts`](../src/engine/tuning.ts) and are never shown as NASA figures.

**How we checked:** each value was searched and checked against its source. *Primary* means we read the original document. For example, we extracted the BVAD PDF text and read Table 3-33 (crew consumables) and Table 4-97 (crop productivity) directly. *Secondary* means we confirmed the value through news coverage of the original paper or press release, without opening the primary paper. *Derived* means we calculated it from other entries, and the formula is in the note.

**Corrections to our starting list:**

| We started with | What the source says |
|---|---|
| O₂ ≈ 0.84 kg/day | **0.816** kg/crew-day (BVAD 2018, Table 3-33). 0.84 comes from older references. |
| Food 1.8 kg/day | **1.51** kg without packaging; **1.83** kg with packaging (ISS container). |
| CO₂ ≈ 1 kg/day | **1.04** kg/crew-day |
| Mars sunlight "43% of the Moon" | Correct at the top of the atmosphere (586.2 vs. 1361 W/m²). At the surface, dust reduces it further. |
| Gravity 38% / 17% | **0.380** (Mars) and **0.165** (Moon) |

**What we could not get from NASA:**
- **Lunar surface radiation.** NASA has no surface measurement (LRO/CRaTER measures in orbit). We use Chang'e 4 (Zhang et al. 2020, *Science Advances*) and label it "Not a NASA measurement" in the game.
- **Solar panel output per m².** NASA publishes no single figure. We derived it from irradiance × the ISS iROSA cell efficiency (30.7%) and mark it as derived and simplified.
- **Crop food energy.** BVAD gives yield in grams; converting it to calories uses USDA potato data (77 kcal/100 g), flagged as non-NASA.

### Full data table

Generated from the data file by `npx tsx scripts/sources-table.ts` (also in [data-sources.md](data-sources.md)).

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

## 7. Balance: tested with thousands of simulated missions

`npm run balance` plays 2,000 missions per strategy per planet with bots that see only what a player sees. Results from the final tuning:

| Strategy | Moon win | Mars win | What it represents |
|---|---|---|---|
| **random** | **0.0%** | **0.0%** | Clicks randomly (random cargo, random splits) |
| naive | 0.0% | 0.0% | Equal split every turn, never adapts |
| **thoughtful** | **96.9%** | **83.2%** | Adapts each turn: life support first, charges before night, maintains, farms, builds regolith |
| allPackagedFood | 83.0% | 89.3% | No greenhouse. Survives often, but on Mars mostly 1 star (crew health averages 49) |
| greenhouseHeavy | 74.7% | 0.0% | 3 greenhouses: possible on the Moon, impossible on Mars with that power |
| solarOnly | 0.0% | 0.0% | No reactor: dies in lunar nights and dust storms |
| fissionOnly | 14.4% | 1.7% | No solar: too little power for the greenhouse |
| heavyPrefabShield | 4.1% | 0.0% | Spent the mass on shielding instead of supplies |
| neverShelter | 52.1% | 68.2% | Always works through solar storms: 47% of Moon losses are radiation |
| alwaysShelter | 94.7% | 83.2% | Safe, but loses work time |

**The targets:** random players usually fail (0%), thoughtful players usually win (83–97%), and no strategy wins every time (the best fixed build reaches 89%, and those wins are mostly 1-star). Raw output is in [balance-report.txt](balance-report.txt) and [balance-results.json](balance-results.json).

## 8. Technology

| Part | Tool | Link |
|---|---|---|
| UI | React 19 + TypeScript | https://react.dev, https://www.typescriptlang.org |
| Build | Vite 8 | https://vite.dev |
| Offline / install | vite-plugin-pwa (Workbox) | https://vite-pwa-org.netlify.app |
| Tests | Vitest | https://vitest.dev |
| Headless simulation | tsx (runs TypeScript in Node) | https://tsx.is |
| Graphics | Inline SVG drawn in code (no image files to download) | — |
| Sound | Web Audio API, synthesized at runtime (no audio files) | https://developer.mozilla.org/docs/Web/API/Web_Audio_API |
| Cloud save (optional) | PHP 8 + SQLite (or MySQL) on the same host | https://www.php.net |
| Hosting | Hostinger shared hosting (static files + PHP) | — |
| Later: Android | Capacitor wraps the same build (relative paths already) | https://capacitorjs.com |

**Architecture:**

```
src/data/nasa.ts      every real number + source            (no UI)
src/engine/           pure TypeScript simulation, seeded RNG (no UI)
  sim.ts              turn resolution, events, forecast, stars, retry
  analysis.ts         debrief: finds the decisive decision
  strategies.ts       bot players for balance tests
src/i18n/             en.ts, ar.ts (all text), RTL switch
src/ui/               React screens, SVG scene, gauges, sound, saves
scripts/balance.ts    plays thousands of missions headlessly
public/api/           tiny PHP cloud-save API
```

The engine is deterministic for a given seed and decisions. That is what makes "retry from turn N, with the same events" possible.

**Saves:** progress is always saved on the device (localStorage), so the game works offline with no account. An optional account (username and password only, no email or other personal data) syncs the same save to the server, so a player can continue on another device. Passwords are hashed with PHP's `password_hash`, tokens are stored hashed, and logins are rate-limited.

## 9. Verification we did

- **27 automated tests:** engine physics (the lunar night cycle, power, water, CO₂, greenhouse, solar storms, dust), loss conditions, debrief attribution, retry, the data file's integrity, and translation completeness (same keys and placeholders in Arabic and English).
- **Production build** succeeds; the precache covers ~340 KB.
- **Played full missions in a browser:** a guided Moon mission on a phone-sized screen through to the debrief, retry from the decisive turn, the Arabic RTL layout, the desktop layout, a Mars start (arrival dose shown), and the storm/solar-event/failure visuals.
- **Cloud save API** tested end to end with SQLite through PHP's built-in server: register, duplicate name, wrong password, save, load, logout, expired token.

**Not verified:** MySQL mode (we had no MySQL server; SQLite is the default and is tested), real-phone install and offline behaviour on Android/iOS, and the screen-reader experience.

## 10. How we used AI tools

We built Regolith Rising with **Claude Code** (Anthropic's AI coding assistant) as a pair programmer, guided by the team's design brief:

- **Data research:** Claude searched for every number, read the NASA BVAD PDF tables directly, corrected values from our starting list, and flagged the values it could not verify. The team reviewed every source link.
- **Code:** Claude wrote the simulation engine, tests, balance simulator, React UI, SVG scene, translations and PHP API, following our requirements, and the team reviewed and play-tested them.
- **Balance:** Claude ran the headless simulator repeatedly and tuned gameplay values against targets we set. The tuning history is in the commit log.
- **Arabic text:** drafted in simple Modern Standard Arabic for 12-year-olds, then reviewed by the team.

All design decisions, the challenge interpretation, and the final review were the team's.
