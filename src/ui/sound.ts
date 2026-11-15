/** Tiny synthesized sound effects (no audio files, so they work offline). */
type Sfx = 'click' | 'launch' | 'endTurn' | 'good' | 'alarm' | 'storm' | 'win' | 'lose';

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean) {
  muted = m;
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.15, slideTo?: number) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(start: number, dur: number, gain = 0.08) {
  const c = ac();
  if (!c) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 600;
  const g = c.createGain();
  g.gain.value = gain;
  src.buffer = buf;
  src.connect(f).connect(g).connect(c.destination);
  src.start(c.currentTime + start);
}

export function play(s: Sfx) {
  if (muted) return;
  try {
    switch (s) {
      case 'click':
        tone(660, 0, 0.06, 'triangle', 0.08);
        break;
      case 'launch':
        noise(0, 1.2, 0.12);
        tone(80, 0, 1.2, 'sawtooth', 0.05, 300);
        break;
      case 'endTurn':
        tone(300, 0, 0.5, 'sine', 0.1, 600);
        tone(450, 0.15, 0.5, 'sine', 0.06, 900);
        break;
      case 'good':
        tone(523, 0, 0.15, 'triangle');
        tone(784, 0.12, 0.25, 'triangle');
        break;
      case 'alarm':
        tone(880, 0, 0.18, 'square', 0.06);
        tone(660, 0.22, 0.18, 'square', 0.06);
        tone(880, 0.44, 0.18, 'square', 0.06);
        break;
      case 'storm':
        noise(0, 1.5, 0.1);
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.15, 0.4, 'triangle', 0.12));
        break;
      case 'lose':
        [392, 330, 262].forEach((f, i) => tone(f, i * 0.25, 0.5, 'sine', 0.12));
        break;
    }
  } catch {
    /* audio is optional */
  }
}
