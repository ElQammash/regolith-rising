/** Print one mission turn by turn: npm run trace -- <strategy> <planet> [seed] */
import { cargoMass } from '../src/engine/cargo';
import { Rng } from '../src/engine/rng';
import { createMission, resolveTurn } from '../src/engine/sim';
import { decide, loadoutFor, type StrategyId } from '../src/engine/strategies';
import type { Planet } from '../src/engine/types';

const strategy = (process.argv[2] ?? 'thoughtful') as StrategyId;
const planet = (process.argv[3] ?? 'mars') as Planet;
const seed = Number(process.argv[4] ?? 1000);
const rng = new Rng(seed ^ 0x9e3779b9);
const loadout = loadoutFor(strategy, planet, rng);
console.log(strategy, planet, JSON.stringify(loadout), 'mass', cargoMass(loadout));
let s = createMission(planet, loadout, seed);
while (s.status === 'playing') {
  s = resolveTurn(s, decide(strategy, s, rng));
  const r = s.history[s.history.length - 1];
  const f = (x: number) => x.toFixed(0).padStart(5);
  console.log(
    `t${String(r.turn).padStart(2)} sun${f(r.events.sunlitFraction * 100)} gen${f(r.forecast.generationKWh)} ls${f(r.lsRatio * 100)} gh${f(r.greenhouseRatio * 100)} farm${f(r.farmRatio * 100)} mnt${f(r.maintRatio * 100)}` +
      ` | food${f(r.after.res.food)} H2O${f(r.after.res.water)} O2${f(r.after.res.o2)} bat${f(r.after.res.batteryKWh)} hp${f(r.after.health)} dose${f(r.after.dose)} sh${f(r.after.shield * 100)} plant${f(r.after.plantHealth)}` +
      ` ${r.events.spe ? 'SPE:' + r.decisions.spe : ''} ${r.events.dustTau ?? ''} ${r.events.failure ?? ''} | ${r.report.causes.map((c) => c.key).join(',')}`,
  );
}
console.log(s.status, s.lossReason);
