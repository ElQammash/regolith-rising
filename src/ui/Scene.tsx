import { useMemo } from 'react';
import { NASA } from '../data/nasa';
import { TUNING, type GameState } from '../engine';

export interface ScenePreview {
  lsRatio: number; // expected life support power ratio with the current plan
  ghRatio: number;
}

interface Props {
  state: GameState;
  preview: ScenePreview;
  passing: boolean;
  progress: number; // 0..1 while time passes
  sheltered: boolean;
}

const W = 400;
const H = 240;
const GROUND = 178;

/** Is it daylight at a given moment of the turn? (Moon: synodic month; Mars: averaged, always "day" in the scene.) */
function lightAt(state: GameState, progress: number): boolean {
  // Mars: 10 sols pass during the animation, each with a short night.
  if (state.planet === 'mars') return (progress * TUNING.daysPerTurn) % 1 < 0.7;
  const day = (state.turn + progress) * TUNING.daysPerTurn;
  const p = NASA.moonSynodicDays.value;
  return day % p < p / 2;
}

function seeded(n: number) {
  let s = n;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export default function Scene({ state, preview, passing, progress, sheltered }: Props) {
  const { planet, loadout: l, events } = state;
  const mars = planet === 'mars';
  const light = passing ? lightAt(state, progress) : events.sunlitFraction >= 0.5;
  const dust = mars && events.dustTau !== null ? Math.min(1, events.dustTau / 7) : 0;
  const spe = events.spe;
  const lights = Math.max(0.08, Math.min(1, preview.lsRatio));
  const shieldH = (state.shield / TUNING.maxShield) * 26;
  const plants = state.plantHealth / 100;
  const health = state.health;
  const co2Haze = Math.min(0.6, state.co2 / 120);
  const battery = l.battery > 0 ? state.res.batteryKWh / (l.battery * TUNING.batteryKWh) : 0;
  const waterFill = Math.min(1, state.res.water / Math.max(100, l.water * 100));
  const o2Fill = Math.min(1, state.res.o2 / Math.max(50, l.oxygen * 50));
  const sunX = passing ? 40 + progress * 320 : 300;
  const sunY = passing ? 60 - Math.sin(progress * Math.PI) * 30 : 42;

  const stars = useMemo(() => {
    const r = seeded(7);
    return Array.from({ length: 40 }, () => ({ x: r() * W, y: r() * (GROUND - 30), s: 0.4 + r() * 0.9 }));
  }, []);

  const skyTop = mars ? (dust > 0 ? '#5a3a24' : light ? '#c99a6b' : '#2a1d18') : '#05060c';
  const skyBottom = mars ? (dust > 0 ? '#8a5a35' : light ? '#e8c39a' : '#3d2a20') : light ? '#141826' : '#020308';
  const groundColor = mars ? '#a4532f' : light ? '#9a9a9a' : '#4a4a50';
  const groundDark = mars ? '#7d3b20' : light ? '#777' : '#36363b';
  const regolithColor = mars ? '#8e4527' : '#85858a';
  const panelColor = light && dust < 0.6 ? '#2b5fa8' : '#1c2a44';
  const showStars = !mars || !light;

  const solarCount = Math.min(l.solar, 8);
  const ghCount = l.greenhouse;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="scene" role="img" aria-label={`${planet} outpost`}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyTop} style={{ transition: 'stop-color 0.6s' }} />
          <stop offset="1" stopColor={skyBottom} style={{ transition: 'stop-color 0.6s' }} />
        </linearGradient>
        <radialGradient id="win" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#fff6c8" />
          <stop offset="1" stopColor="#ffbf3f" />
        </radialGradient>
        <linearGradient id="dome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9eef5" />
          <stop offset="1" stopColor="#b8c2cf" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect x="0" y="0" width={W} height={H} fill="url(#sky)" />
      {showStars && stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#fff" opacity={light ? 0.5 : 0.9} />)}

      {/* Earth in the lunar sky */}
      {!mars && (
        <g transform="translate(70 40)">
          <circle r="11" fill="#2f6fd6" />
          <path d="M-6,-4 q4,-5 8,-1 q3,4 -2,6 q-5,1 -6,-5z M3,3 q4,1 4,4 q-3,1 -5,-2z" fill="#4caf50" />
          <circle r="11" fill="none" stroke="#9cc5ff" strokeWidth="0.8" opacity="0.6" />
        </g>
      )}

      {/* Sun */}
      {light && (
        <g opacity={mars ? 1 - dust * 0.85 : 1}>
          <circle cx={sunX} cy={sunY} r={mars ? 7 : 11} fill={mars ? '#fff3d6' : '#fffbe8'} />
          <circle cx={sunX} cy={sunY} r={mars ? 14 : 20} fill={mars ? '#ffe9b8' : '#fff7d0'} opacity="0.25" />
        </g>
      )}

      {/* Solar particle event: flickering streaks */}
      {spe && (
        <g className="spe-flash">
          {Array.from({ length: 9 }, (_, i) => (
            <line key={i} x1={20 + i * 45} y1={0} x2={i * 45} y2={GROUND - 20} stroke="#e8f75a" strokeWidth="1.2" opacity="0.7" />
          ))}
        </g>
      )}

      {/* Ground */}
      <path d={`M0 ${GROUND} Q 80 ${GROUND - 12} 160 ${GROUND - 4} T 320 ${GROUND - 6} T ${W} ${GROUND} V ${H} H 0 Z`} fill={groundColor} style={{ transition: 'fill 0.6s' }} />
      <path d={`M0 ${GROUND + 26} Q 120 ${GROUND + 14} 220 ${GROUND + 24} T ${W} ${GROUND + 20} V ${H} H 0 Z`} fill={groundDark} opacity="0.6" />
      {!mars && [30, 120, 330, 370].map((x, i) => <ellipse key={i} cx={x} cy={GROUND + 30 + (i % 2) * 14} rx={10 + i * 2} ry={3} fill="#555" opacity="0.5" />)}

      {/* Greenhouses (left) */}
      {Array.from({ length: ghCount }, (_, i) => {
        const x = 20 + i * 46;
        const leafColor = plants > 0.6 ? '#4caf50' : plants > 0.3 ? '#9bb54a' : '#8d6e3f';
        const growth = 0.3 + 0.7 * plants;
        return (
          <g key={i} transform={`translate(${x} ${GROUND - 2})`}>
            <path d="M0 0 A 20 20 0 0 1 40 0 Z" fill="#cfe8ff" opacity="0.35" stroke="#e5f2ff" strokeWidth="1" />
            {Array.from({ length: 5 }, (_, k) => (
              <g key={k} transform={`translate(${6 + k * 7} 0) scale(${growth})`} style={{ transition: 'transform 0.8s' }}>
                <line x1="0" y1="0" x2="0" y2="-12" stroke="#5d7a3a" strokeWidth="1" />
                <ellipse cx="-3" cy="-9" rx="3.5" ry="2" fill={leafColor} transform="rotate(-30 -3 -9)" />
                <ellipse cx="3" cy="-12" rx="3.5" ry="2" fill={leafColor} transform="rotate(30 3 -12)" />
              </g>
            ))}
            <rect x="-1" y="-1" width="42" height="3" fill="#9aa4b1" />
            <circle cx="36" cy="-6" r="1.6" fill={preview.ghRatio >= 0.95 ? '#c6ff6a' : preview.ghRatio > 0.3 ? '#ffd24d' : '#ff5a4d'} />
          </g>
        );
      })}

      {/* Habitat (centre) with regolith shielding */}
      <g transform={`translate(170 ${GROUND})`}>
        <path d="M0 0 V -26 A 30 18 0 0 1 60 -26 V 0 Z" fill="url(#dome)" stroke="#8b96a5" />
        {[12, 30, 48].map((x) => (
          <rect key={x} x={x - 5} y={-24} width="10" height="9" rx="2" fill="url(#win)" opacity={lights} style={{ transition: 'opacity 0.5s' }} />
        ))}
        {co2Haze > 0.05 && <rect x="6" y="-26" width="48" height="12" fill="#9e9e72" opacity={co2Haze} />}
        <rect x="24" y="-12" width="12" height="12" rx="1" fill="#6b7685" />
        {/* regolith piled on the roof */}
        {shieldH > 0.5 && (
          <path
            d={`M-6 0 Q -4 ${-26 - shieldH * 0.4} 10 ${-30 - shieldH * 0.8} Q 30 ${-40 - shieldH} 50 ${-30 - shieldH * 0.8} Q 64 ${-26 - shieldH * 0.4} 66 0 Z`}
            fill={regolithColor}
            opacity="0.95"
            style={{ transition: 'd 0.8s' }}
          />
        )}
        {shieldH > 0.5 && [12, 30, 48].map((x) => <rect key={x} x={x - 4} y={-23} width="8" height="7" rx="2" fill="url(#win)" opacity={lights} />)}
        {/* prefab shield panels */}
        {l.shield > 0 && <rect x="-3" y="-6" width="66" height="6" fill="#6f7a8a" opacity="0.9" />}
      </g>

      {/* Batteries */}
      {Array.from({ length: Math.min(l.battery, 4) }, (_, i) => (
        <g key={i} transform={`translate(${236 + i * 11} ${GROUND - 12})`}>
          <rect width="9" height="12" rx="1" fill="#3b4250" stroke="#222" strokeWidth="0.5" />
          <rect x="1.5" y={1.5 + 9 * (1 - battery)} width="6" height={9 * battery} fill={battery > 0.3 ? '#62d26f' : '#ff6b5a'} style={{ transition: 'all 0.5s' }} />
        </g>
      ))}

      {/* Tanks: water and oxygen */}
      <g transform={`translate(150 ${GROUND - 16})`}>
        <rect width="10" height="16" rx="4" fill="#dfe6ee" stroke="#8fa0b2" strokeWidth="0.6" />
        <rect x="2" y={2 + 12 * (1 - waterFill)} width="6" height={12 * waterFill} rx="2" fill="#3fa9f5" style={{ transition: 'all 0.5s' }} />
      </g>
      <g transform={`translate(136 ${GROUND - 14})`}>
        <rect width="9" height="14" rx="4" fill="#f4f4f4" stroke="#8fa0b2" strokeWidth="0.6" />
        <rect x="2" y={2 + 10 * (1 - o2Fill)} width="5" height={10 * o2Fill} rx="2" fill="#9fe3ff" style={{ transition: 'all 0.5s' }} />
      </g>

      {/* Solar arrays (right) */}
      {Array.from({ length: solarCount }, (_, i) => {
        const x = 282 + (i % 4) * 28;
        const y = GROUND - 8 - Math.floor(i / 4) * 0;
        const row = Math.floor(i / 4);
        return (
          <g key={i} transform={`translate(${x - row * 12} ${y + row * 14})`}>
            <line x1="10" y1="0" x2="10" y2="10" stroke="#999" strokeWidth="1.2" />
            <polygon points="0,-6 22,-10 24,-1 2,3" fill={panelColor} stroke="#9fb3cf" strokeWidth="0.5" style={{ transition: 'fill 0.6s' }} />
            {light && dust < 0.5 && <line x1="4" y1="-5" x2="18" y2="-8" stroke="#bfe0ff" strokeWidth="0.6" opacity="0.7" />}
          </g>
        );
      })}

      {/* Fission reactor (far, behind a berm) */}
      {l.fission > 0 && (
        <g transform={`translate(360 ${GROUND - 30})`}>
          <path d="M-14 22 Q 0 10 14 22 Z" fill={groundDark} />
          <rect x="-4" y="0" width="8" height="18" rx="2" fill="#c7ccd3" />
          {[-1, 1].map((s) => (
            <polygon key={s} points={`${s * 4},2 ${s * 16},-4 ${s * 16},10 ${s * 4},14`} fill="#8e98a6" opacity="0.9" />
          ))}
          <circle cx="0" cy="4" r="1.8" fill={events.failure === 'fission' ? '#ff5a4d' : '#7dff9a'} className="blink" />
          {l.fission > 1 && <text x="0" y="-8" fontSize="7" textAnchor="middle" fill="#fff">×{l.fission}</text>}
        </g>
      )}

      {/* MOXIE */}
      {mars && l.moxie > 0 && (
        <g transform={`translate(258 ${GROUND - 26})`}>
          <rect width="12" height="9" rx="1" fill="#d6d9de" />
          <circle cx="6" cy="-3" r="2" fill="#bde9ff" opacity="0.8" className="puff" />
        </g>
      )}

      {/* Crew */}
      {!sheltered &&
        Array.from({ length: 4 }, (_, i) => {
          const x = 120 + i * 13 + (i > 1 ? 112 : 0);
          const mood = health > 70 ? 'happy' : health > 40 ? 'ok' : 'sad';
          return (
            <g key={i} transform={`translate(${x} ${GROUND - 2})`} className={`crew crew-${mood}`} style={{ animationDelay: `${i * 0.3}s` }}>
              <rect x="-2.5" y="-9" width="5" height="7" rx="2" fill="#f2f2f2" />
              <circle cx="0" cy="-11.5" r="3" fill="#f2f2f2" />
              <rect x="-2" y="-12.8" width="4" height="2.2" rx="1" fill={mood === 'sad' ? '#7a5c5c' : '#ffb347'} />
              <line x1="-1.3" y1="-2" x2="-1.6" y2="0" stroke="#ddd" strokeWidth="1.4" />
              <line x1="1.3" y1="-2" x2="1.6" y2="0" stroke="#ddd" strokeWidth="1.4" />
              {mood === 'happy' && <line className="arm" x1="2.5" y1="-8" x2="5" y2="-11" stroke="#eee" strokeWidth="1.2" />}
              {mood === 'sad' && <line x1="2.5" y1="-8" x2="3.5" y2="-4" stroke="#eee" strokeWidth="1.2" />}
            </g>
          );
        })}

      {/* Dust storm overlay */}
      {dust > 0 && (
        <g className="dust" opacity={0.3 + dust * 0.5}>
          <rect x="0" y="0" width={W} height={H} fill="#a0663a" opacity={0.25 + dust * 0.35} />
          {Array.from({ length: 30 }, (_, i) => (
            <circle key={i} cx={(i * 53) % W} cy={(i * 37) % GROUND} r={1 + (i % 3)} fill="#d69a66" opacity="0.6" />
          ))}
        </g>
      )}

      {/* Night tint */}
      {!light && <rect x="0" y="0" width={W} height={H} fill="#000820" opacity={mars ? 0.2 : 0.35} style={{ transition: 'opacity 0.6s' }} />}
    </svg>
  );
}
