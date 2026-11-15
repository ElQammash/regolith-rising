/** Generates the PWA PNG icons without any image library (plain zlib + PNG chunks). */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function pixel(x: number, y: number): RGB {
  // coordinates in 0..1
  const sky = hex('#0b1020');
  const ground = 0.72 + 0.04 * Math.sin(x * 6);
  if ((x - 0.72) ** 2 + (y - 0.25) ** 2 < 0.008) return hex('#fff3d6');
  // regolith mound over habitat
  const mound = 0.5 - 0.22 * Math.cos(((x - 0.5) / 0.3) * (Math.PI / 2));
  if (Math.abs(x - 0.5) < 0.3 && y > mound && y < ground + 0.01) {
    if (y > 0.58 && y < 0.64 && (Math.abs(x - 0.42) < 0.035 || Math.abs(x - 0.58) < 0.035)) return hex('#ffd24d');
    return hex('#8e4527');
  }
  if (y > ground) return hex('#a4532f');
  // stars
  const s = Math.sin(x * 91.7 + y * 47.3) * 43758.5453;
  if (s - Math.floor(s) > 0.995) return [255, 255, 255];
  return sky;
}

function png(size: number): Buffer {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x / size, y / size);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync('public/icons', { recursive: true });
for (const s of [192, 512]) writeFileSync(`public/icons/icon-${s}.png`, png(s));
console.log('icons written');
