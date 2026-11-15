/**
 * Headless balance simulator: plays thousands of missions per strategy and
 * prints win rates, stars and loss reasons. Usage:
 *   npm run balance            (2000 missions per strategy per planet)
 *   npm run balance -- 500     (custom count)
 *   npm run balance -- 2000 --json results.json
 */
import { writeFileSync } from 'node:fs';
import { createMission, resolveTurn, starsFor } from '../src/engine/sim';
import { Rng } from '../src/engine/rng';
import { decide, loadoutFor, STRATEGIES, type StrategyId } from '../src/engine/strategies';
import type { LossReason, Planet } from '../src/engine/types';

const N = Number(process.argv[2]) || 2000;
const jsonIdx = process.argv.indexOf('--json');
const jsonPath = jsonIdx > 0 ? process.argv[jsonIdx + 1] : null;

interface Row {
  planet: Planet;
  strategy: StrategyId;
  winRate: number;
  avgStars: number;
  stars: [number, number, number];
  losses: Record<LossReason, number>;
  avgEndTurn: number;
  avgDoseWin: number;
  avgHealthWin: number;
}

function runOne(planet: Planet, strategy: StrategyId, seed: number) {
  const botRng = new Rng(seed ^ 0x9e3779b9);
  const loadout = loadoutFor(strategy, planet, botRng);
  let s = createMission(planet, loadout, seed);
  while (s.status === 'playing') s = resolveTurn(s, decide(strategy, s, botRng));
  return s;
}

const rows: Row[] = [];
for (const planet of ['moon', 'mars'] as Planet[]) {
  for (const strategy of STRATEGIES) {
    let wins = 0;
    let starSum = 0;
    let endSum = 0;
    let doseSum = 0;
    let healthSum = 0;
    const stars: [number, number, number] = [0, 0, 0];
    const losses: Record<LossReason, number> = { oxygen: 0, water: 0, food: 0, health: 0, radiation: 0 };
    for (let i = 0; i < N; i++) {
      const s = runOne(planet, strategy, 1000 + i * 7919);
      endSum += s.history.length;
      if (s.status === 'won') {
        wins++;
        doseSum += s.dose;
        healthSum += s.health;
        const st = starsFor(s);
        starSum += st;
        stars[st - 1]++;
      } else if (s.lossReason) losses[s.lossReason]++;
    }
    rows.push({ planet, strategy, winRate: wins / N, avgStars: wins ? starSum / wins : 0, stars, losses, avgEndTurn: endSum / N, avgDoseWin: wins ? doseSum / wins : 0, avgHealthWin: wins ? healthSum / wins : 0 });
  }
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`.padStart(6);
console.log(`\nRegolith Rising balance report: ${N} missions per strategy per planet\n`);
for (const planet of ['moon', 'mars'] as Planet[]) {
  console.log(`== ${planet.toUpperCase()} ==`);
  console.log('strategy            win    stars(1/2/3)       avgTurns  losses (O2/H2O/food/health/rad)        winDose winHP');
  for (const r of rows.filter((x) => x.planet === planet)) {
    const st = r.stars.map((x) => pct(x / N)).join(' ');
    const lo = (['oxygen', 'water', 'food', 'health', 'radiation'] as LossReason[]).map((k) => pct(r.losses[k] / N)).join(' ');
    console.log(`${r.strategy.padEnd(18)} ${pct(r.winRate)}  ${st}  ${r.avgEndTurn.toFixed(1).padStart(6)}   ${lo}   ${r.avgDoseWin.toFixed(0).padStart(5)} ${r.avgHealthWin.toFixed(0).padStart(4)}`);
  }
  console.log('');
}

if (jsonPath) writeFileSync(jsonPath, JSON.stringify({ missionsPerStrategy: N, rows }, null, 2));
