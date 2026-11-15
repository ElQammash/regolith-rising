# Space Apps 2026: Project Submission Draft

**Project name:** Regolith Rising
**Team:** AstraQuest
**Challenge:** Build a Junior Astronaut Mission Trainer
**Demo:** `https://<your-domain>/`
**Repository:** https://github.com/ElQammash/regolith-rising

---

## High-level summary

Regolith Rising is a game where students aged 10 to 14 command a 4-person outpost on the Moon or on Mars for 300 days. They pack a rocket with a fixed mass limit, then split scarce power and crew time every 10 days. Meanwhile they face solar storms, Martian dust storms, two-week lunar nights and equipment failures. The trade-offs are felt, not explained. If the player cuts greenhouse power, the plants wilt on screen and food runs out turns later. If they skip a battery before lunar night, the habitat lights dim and CO₂ builds up. A debrief points to the single decision that saved or doomed the mission and lets the player retry from that exact turn. Every number comes from a sourced NASA data file, with a "Source" button in the game and honest labels on what was simplified. The game plays in Arabic and English, works offline, and installs on a phone.

## What it does

- **Cargo loadout:** one mass budget shared by packaged food, greenhouses, solar panels, batteries, a Kilopower-style fission unit, prefab shielding and (on Mars) a MOXIE-style oxygen maker.
- **Turn planning:** split 10 power blocks between life support, the greenhouse and battery charging, and 10 crew-time blocks between maintenance, farming and piling regolith for shielding.
- **Living scene:** an illustrated outpost that shows the state of the mission. Modules appear, lights dim with power, plants grow or wilt, regolith piles up, the sky changes for lunar night, dust storms and solar events, and the crew react.
- **Turn report:** one or two sentences on what changed and why, plus a NASA fact card tied to the event.
- **Debrief:** a mission timeline, a supplies chart, the decisive decision ("Turn 6: you cut greenhouse power to 20%. Food ran out 9 turns later") and a retry from that turn.
- **Guided first mission:** short tips, one at a time, instead of an instruction page.
- **Optional cloud save:** username and password only, so a student can continue on another device.

## How it addresses the challenge

1. **Trade-offs through play.** Every choice takes something from another system. Our balance tests (2,000 simulated missions per strategy) show that random play always fails (0%), adaptive play usually wins (97% Moon, 83% Mars), and no fixed strategy wins every time.
2. **Real NASA data.** Crew needs, water recycling, radiation, sunlight, day length, MOXIE, Kilopower, crop yields and the 2018 dust storm all come from NASA sources. Two values have no NASA source (lunar surface dose from Chang'e 4, and potato energy from USDA), and the game says so.
3. **No instructions needed.** Block-based controls with "need" markers, colour-coded gauges, short sentences, a guided first mission, and simple Arabic for 12-year-olds with full right-to-left layout.
4. **The Moon and Mars differ physically:** a 29.5-day lunar cycle vs. a 24 h 39 min sol, 1361 vs. 586 W/m² of sunlight, dust storms and MOXIE only on Mars, the transit dose only on Mars, and harsher solar storms on the airless Moon.

## NASA data used

- NASA Life Support Baseline Values and Assumptions Document (BVAD, 2018): O₂ 0.816, CO₂ 1.04, water 2.5 and food 1.51/1.83 kg per crew-day; crop productivity (Table 4-97).
- NASA ISS water recovery milestone (2023): 98% with the Brine Processor Assembly (93–94% before it).
- Curiosity RAD (Hassler et al. 2014; Zeitlin et al. 2013): 0.67 mSv/day on the Mars surface, 1.8 mSv/day in transit.
- NASA-STD-3001 / OCHMO: the 600 mSv career dose limit.
- NASA Curiosity RAD, May 2024 solar storm: 8.1 mGy in a single event.
- NASA NSSDC Moon and Mars fact sheets: 29.53-day synodic month, 1361/586.2 W/m², gravity, sol length, 95.1% CO₂.
- Perseverance MOXIE: 12 g O₂/hour best rate (design goal 6 g/h).
- Kilopower / KRUSTY: a 1 kWe-class fission system, ~400 kg.
- Opportunity and the 2018 global dust storm: record τ = 10.8.
- ISS iROSA solar cells: 30.7% efficiency.
- NASA Human Research Program: degradation of packaged-food nutrients.

Non-NASA, clearly labelled: Chang'e 4 LND lunar surface dose (Zhang et al. 2020), and USDA potato energy.

## Space agency data

See the full table with links in the repository: `docs/data-sources.md`.

## Use of Artificial Intelligence

We used **Claude Code** (Anthropic) as an AI pair programmer. It searched for and checked NASA figures (including reading the BVAD tables directly), wrote the TypeScript simulation, tests, balance simulator, React interface, SVG artwork, translations and the PHP save API, and ran thousands of simulated missions to tune the balance against targets we set. The team defined the design, reviewed the data sources, play-tested the game and made the final decisions. The game's art is SVG drawn in code (part of the source); we used no AI image generators. Arabic text was drafted with the AI and reviewed by the team.

## Tools

React, TypeScript, Vite, vite-plugin-pwa (Workbox), Vitest, tsx, the Web Audio API, PHP 8 + SQLite, Hostinger, and GitHub.
