export type Planet = 'moon' | 'mars';

export type CargoId =
  | 'food'
  | 'water'
  | 'oxygen'
  | 'greenhouse'
  | 'solar'
  | 'battery'
  | 'fission'
  | 'shield'
  | 'moxie';

export type Loadout = Record<CargoId, number>;

export interface PowerSplit {
  lifeSupport: number; // fractions, normalized by the engine
  greenhouse: number;
  battery: number;
}

export interface CrewSplit {
  maintenance: number;
  farming: number;
  regolith: number;
}

export type SpeResponse = 'shelter' | 'work';

export interface Decisions {
  power: PowerSplit;
  crew: CrewSplit;
  spe?: SpeResponse;
}

export type FailureKind = 'solar' | 'recycler' | 'greenhouse' | 'fission' | 'battery';

export interface TurnEvents {
  spe: boolean;
  dustTau: number | null; // tau during this turn if a storm is active
  dustStormStarted: boolean;
  failure: FailureKind | null;
  sunlitFraction: number; // 0..1 share of the turn in daylight
}

export type LossReason = 'oxygen' | 'water' | 'food' | 'health' | 'radiation';

export interface Resources {
  o2: number; // kg
  water: number; // kg
  food: number; // crew-days
  batteryKWh: number;
}

export interface GameState {
  planet: Planet;
  loadout: Loadout;
  seed: number;
  rng: number;
  turn: number; // 0-based index of the turn being planned
  res: Resources;
  health: number; // 0..100
  dose: number; // mSv, cumulative (includes transit for Mars)
  shield: number; // 0..maxShield fraction of dose blocked
  co2: number; // 0..100 cabin CO2 index
  wear: number; // 0..100 equipment wear
  plantHealth: number; // 0..100
  greenhouseAge: number; // turns the greenhouse has been growing
  dustStormUsed: boolean;
  dustStormStep: number; // -1 = no storm, else index into tau profile
  events: TurnEvents; // events for the turn being planned (rolled at turn start)
  status: 'playing' | 'won' | 'lost';
  lossReason: LossReason | null;
  history: TurnRecord[];
}

/** What the engine expects this turn, so the UI and bots can plan. */
export interface Forecast {
  generationKWh: number;
  solarKWh: number;
  fissionKWh: number;
  lifeSupportNeedKWh: number;
  greenhouseNeedKWh: number;
  batteryRoomKWh: number;
  crewHours: number;
  maintenanceNeedHours: number;
  farmingNeedHours: number;
  doseThisTurn: number; // if no SPE
}

export type CauseKey =
  | 'lsUnderpowered'
  | 'waterRecoveryLow'
  | 'co2Rising'
  | 'co2Cleared'
  | 'greenhouseWilting'
  | 'greenhouseThriving'
  | 'greenhouseYoung'
  | 'batteryEmpty'
  | 'batteryCovered'
  | 'lunarNight'
  | 'dustStorm'
  | 'speSheltered'
  | 'speWorked'
  | 'failure'
  | 'shieldBuilt'
  | 'foodLow'
  | 'waterLow'
  | 'o2Low'
  | 'doseHigh'
  | 'allGood';

export interface Cause {
  key: CauseKey;
  params?: Record<string, number | string>;
}

export interface TurnReport {
  turn: number;
  causes: Cause[]; // most important first; UI shows 1-2
  factKey: string;
  delta: { o2: number; water: number; food: number; battery: number; health: number; dose: number; shield: number };
}

export interface TurnRecord {
  turn: number;
  before: GameState; // snapshot (without history) to allow retry from this turn
  decisions: Decisions;
  events: TurnEvents;
  forecast: Forecast;
  lsRatio: number;
  greenhouseRatio: number;
  farmRatio: number;
  maintRatio: number;
  regolithHours: number;
  report: TurnReport;
  after: { res: Resources; health: number; dose: number; shield: number; co2: number; plantHealth: number; wear: number };
}
