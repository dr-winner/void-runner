// Mulberry32 deterministic PRNG
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type RNG = () => number;
export const ri = (r: RNG, a: number, b: number) => Math.floor(r() * (b - a + 1)) + a;
export const pick = <T,>(r: RNG, arr: T[]): T => arr[Math.floor(r() * arr.length)];
