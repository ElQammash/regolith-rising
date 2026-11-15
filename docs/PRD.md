# Regolith Rising — Product Requirements Document

**Team:** AstraQuest
**Event:** NASA Space Apps Challenge 2026
**Challenge:** Build a Junior Astronaut Mission Trainer
**Status:** v1.0 (2026-11-15). Built and verified. The numbers have been checked against their sources (corrections are listed in `docs/PROJECT.md` §6), and the final values live in `src/data/nasa.ts`.

**Changes since v0.1:**
- Optional cloud save with an account (username and password only), added at the team's request. Saving on the device stays the default, and the game still works offline with no account.
- Mass budgets were tuned to 4,700 kg (Moon) and 4,600 kg (Mars).
- A health effect for "no fresh food after turn 10" was added, based on NASA HRP findings on nutrient degradation.
- Final balance results are in `docs/PROJECT.md` §7.

---

## 1. Summary

Regolith Rising is a mobile-first web game (PWA, works offline) for players aged 10 to 14. The player commands a 4-person outpost on the Moon or on Mars for 30 turns, and each turn is 10 days. They pack the cargo, split power and crew time every turn, and deal with radiation storms, dust storms, lunar night and broken equipment. At the end, a debrief shows which decisions saved or doomed the mission.

## 2. Problem

Space-themed STEM content tends to fall into one of two traps. Either it hides the engineering trade-offs of a real mission, or it shows them in a way that is too complex for young learners. Students rarely get to *feel* why mass, power, shielding and food compete with each other.

## 3. Goals (mapped to the judging criteria)

| Judging criterion | How we meet it |
|---|---|
| Players feel the trade-offs through play, not through text | One shared mass budget for the cargo. Every turn, power and crew hours are split, so giving more to one thing always means less for another. The scene shows the result (dim lights, wilting plants). |
| Real NASA data | One data file holds every number, each with its source and URL and a flag for whether it was simplified. Every number shown in the game has a "source" button. |
| A 10 to 14 year old can play without instructions | A short guided first mission, big colour-coded gauges, short sentences, and simple Arabic and English text. |

**Non-goals:** multiplayer, accounts, a backend, a 3D engine, or a realistic orbital mechanics model.

## 4. Target users

- **Primary:** students aged 10 to 14, mostly on phones, playing in Arabic or English.
- **Secondary:** teachers running a 20–30 minute classroom activity, and the Space Apps judges.

## 5. Core game loop

### 5.1 Before launch: cargo loadout
There is one fixed mass budget, and the options compete for it:
- Food: packaged food vs. a greenhouse (lighter over a long mission, but needs power and crew time).
- Power: extra solar panels vs. batteries vs. a small fission unit (Kilopower-class).
- Shielding: prefabricated shielding (heavy, protects right away) vs. building shielding from regolith later (no mass, but costs crew hours).
- Mars only: an optional MOXIE-style unit that makes oxygen from CO2.

### 5.2 Every turn (10 days)
- **Power split** between life support, the greenhouse and battery charging. If life support gets too little power, it recycles less water and CO2 builds up.
- **Crew hours split** between maintenance, farming and piling regolith. With too little maintenance, equipment fails more often. With too little farming, the greenhouse yields less.

### 5.3 Turn report
One or two short sentences on what changed and why, plus one NASA fact card tied to what just happened.

### 5.4 Events
| Event | Moon | Mars | Player choice |
|---|---|---|---|
| Solar particle event | ✓ | ✓ | Shelter (lose the turn's work) or keep working (take the dose) |
| Dust storm (modelled on the 2018 global storm) | — | ✓ | Solar output drops for several turns |
| Lunar night (~14 Earth days of darkness) | ✓ | — | Sunlit fraction of each turn computed from the 29.5-day synodic month |
| Equipment failure | ✓ | ✓ | Probability rises when maintenance is low |

### 5.5 Moon vs. Mars (the physics differ, not just the look)
- **Moon:** long nights, full-strength sunlight, no atmosphere (so no dust storms and no oxygen from the air), lower gravity.
- **Mars:** weaker sunlight, dust storms, MOXIE available, and the crew arrives already carrying the dose from the trip.

### 5.6 End conditions
- **Loss:** oxygen, water or food runs out, crew health reaches 0, or the cumulative dose passes the career limit.
- **Win:** the crew survives 30 turns. 1 to 3 stars are awarded based on crew health, dose received and supplies left.

### 5.7 Debrief (the educational payoff)
- The game logs the full state and the player's decisions every turn.
- A timeline points to the decision that mattered most, for example "Turn 6: you cut greenhouse power; food ran out 9 turns later."
- The player can retry from any turn.

## 6. Data requirements

- **Single source of truth:** `src/data/nasa.ts`. Each entry has `value`, `unit`, `sourceName`, `sourceUrl`, `simplified: boolean` and an optional `note`.
- Each value is checked against its original source before it goes into the code. Anything we could not verify is marked as unverified and is not presented as a NASA figure.
- An adjusted gameplay value is never shown as a raw NASA figure. The source panel shows both the raw value and the game value.

Values to verify (the list we started from): water, food, O2 and CO2 per crew member per day (BVAD); ISS water recovery; Mars surface and transit radiation (Curiosity RAD); the career dose limit; Mars vs. Moon sunlight; sol length and gravity; MOXIE output; Kilopower output; the 2018 dust storm.
Values to find: lunar surface radiation; solar panel output per m²; crop yields from NASA plant-growth research.

## 7. Experience requirements

- The centre of the screen is an illustrated 2D SVG scene that reflects the state of the mission: the modules the player brought, dimmed lights, the greenhouse growing or wilting, regolith piling on the habitat, the sky (night, dust, solar event), and crew reactions.
- The controls sit around the scene and never replace it.
- Ending a turn is an event: time passes visibly in the scene before the report appears.
- Short synthesized sound effects (WebAudio) and a mute button.
- Big gauges that change colour before a crisis. Animation is used only where it explains cause and effect.
- Arabic and English, with a language switch and full RTL layout. All text lives in translation files. The Arabic is simple Modern Standard Arabic that a 12-year-old can read easily.
- A guided first mission instead of a page of instructions.

## 8. Technical requirements

- React, Vite and TypeScript, built to static files.
- A PWA (vite-plugin-pwa) that can be installed and played offline.
- No backend. Saves and settings live in `localStorage`.
- Mobile-first layout.
- Relative asset paths (`base: './'`) so the same build works from the domain root on Hostinger and inside Capacitor later.
- **Architecture:**
  - `src/engine/`: pure TypeScript simulation with no UI imports, seeded RNG and deterministic turns.
  - `src/data/`: the NASA data file.
  - `src/i18n/`: `en.json` and `ar.json`.
  - `src/ui/`: React components and the SVG scene.
  - `scripts/balance.ts`: a headless simulator that plays thousands of missions.
- **Tests:** Vitest unit tests for the engine.

## 9. Balance targets (checked with the headless simulator)

| Strategy | Target win rate |
|---|---|
| Random clicks | Usually fails (aim < 20%) |
| Thoughtful / adaptive | Usually wins (aim > 70%) |
| Any single fixed strategy | Never 100%, and no dominant build |

Final targets and results go into the project documentation.

## 10. Milestones

1. Verify the NASA data and write the data file.
2. Simulation engine and unit tests.
3. Headless balance simulator, tuning, and the results table.
4. UI: loadout, turn screen and scene, report, debrief.
5. i18n (AR/EN, RTL), guided first mission, sound.
6. PWA and offline support, production build.
7. Verification: tests, build, a full play-through on both levels.
8. Deliverables: Hostinger upload steps, README with the sources, project documentation (Markdown + PDF), and the Space Apps description.

## 11. Deliverables

- Production build (`dist/`), plus `.htaccess` and upload steps for Hostinger hPanel.
- Public GitHub repository: `regolith-rising`.
- `README.md` that lists every data source.
- `docs/PROJECT.md` and `docs/PROJECT.pdf`: the full project documentation, covering the idea, design reasoning, how to play, every number with its source and simplification flag, the balance results, the tech stack with links, and how we used AI tools.
- A draft project description for the Space Apps submission page.

## 12. Risks

| Risk | Mitigation |
|---|---|
| Time (the deadline is today) | Engine and data come first. Polish is cut first: extra animation, then sound variety. |
| A NASA number we cannot verify | Flag it openly and show its real source. Never present it as NASA data. |
| Balance is hard to get right | Tune it with numbers from the simulator, not by feel. |
| RTL layout bugs | Use CSS logical properties from the start, and test both languages on phone widths. |

## 13. Acceptance criteria

- The unit tests pass and the production build succeeds.
- The simulator results meet the balance targets in §9.
- A full mission can be played on the Moon and on Mars, in Arabic and in English, on a phone-width screen.
- The game still loads with the network off after the first visit.
- Every number shown in the game has a working "source" button.
