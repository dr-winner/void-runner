import { MAP_W, MAP_H, TILES, BiomeIdx, MAX_STAGE, isBossStage, isFinalStage } from "./constants";
import { RNG, ri } from "./rng";

export interface GeneratedMap {
  tiles: number[][]; // [y][x]
  biome: BiomeIdx;
  stage: number;
  spawn: { x: number; y: number };
  pad: { x: number; y: number };
  workbench: { x: number; y: number };
  enemySpawns: { x: number; y: number }[];
  bossSpawn: { x: number; y: number } | null;
  lootSpots: { x: number; y: number }[];
}

function carveCellular(rng: RNG, fillProb: number, steps: number) {
  const grid: number[][] = [];
  for (let y = 0; y < MAP_H; y++) {
    grid[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      const edge = x < 2 || y < 2 || x >= MAP_W - 2 || y >= MAP_H - 2;
      grid[y][x] = edge || rng() < fillProb ? 1 : 0;
    }
  }
  for (let s = 0; s < steps; s++) {
    const next: number[][] = grid.map((r) => r.slice());
    for (let y = 1; y < MAP_H - 1; y++) {
      for (let x = 1; x < MAP_W - 1; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) if (grid[y + dy][x + dx]) n++;
        next[y][x] = n >= 5 ? 1 : 0;
      }
    }
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) grid[y][x] = next[y][x];
  }
  return grid;
}

function floodFillLargest(grid: number[][]): Set<string> {
  const seen: boolean[][] = grid.map((r) => r.map(() => false));
  let best = new Set<string>();
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (grid[y][x] === 0 && !seen[y][x]) {
        const region = new Set<string>();
        const stack = [[x, y]];
        while (stack.length) {
          const [cx, cy] = stack.pop()!;
          if (cx < 0 || cy < 0 || cx >= MAP_W || cy >= MAP_H) continue;
          if (seen[cy][cx] || grid[cy][cx] !== 0) continue;
          seen[cy][cx] = true;
          region.add(`${cx},${cy}`);
          stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
        }
        if (region.size > best.size) best = region;
      }
    }
  }
  return best;
}

export function generateMap(rng: RNG, biome: BiomeIdx, stage: number): GeneratedMap {
  const fill = biome === 1 ? 0.46 : biome === 2 ? 0.5 : 0.42;
  const grid = carveCellular(rng, fill, 5);
  const region = floodFillLargest(grid);
  // Force everything outside main region to wall
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) if (!region.has(`${x},${y}`) && grid[y][x] === 0) grid[y][x] = 1;

  // Decorate floors with biome-specific obstacles
  const tiles: number[][] = grid.map((row) =>
    row.map((v) => {
      if (v === 1) return TILES.WALL;
      const r = rng();
      if (biome === 0 && r < 0.04) return TILES.ROCK;
      if (biome === 1 && r < 0.07) return TILES.TREE;
      if (biome === 2 && r < 0.05) return TILES.RUIN;
      if (r < 0.01) return TILES.WATER;
      return TILES.FLOOR;
    }),
  );

  const open: { x: number; y: number }[] = [];
  region.forEach((k) => {
    const [x, y] = k.split(",").map(Number);
    if (tiles[y][x] === TILES.FLOOR) open.push({ x, y });
  });

  const take = () => {
    const i = ri(rng, 0, open.length - 1);
    return open.splice(i, 1)[0];
  };

  const safeStage = Math.max(1, Math.min(MAX_STAGE, stage));

  const spawn = take();
  const pad = take();
  tiles[pad.y][pad.x] = TILES.PAD;
  const workbench = take();
  tiles[workbench.y][workbench.x] = TILES.WORKBENCH;

  const bossStage = isBossStage(safeStage);
  const bossSpawn = bossStage ? take() : null;

  // Scale enemy count with stage. Hard-capped so physics + AI stay cheap —
  // late-stage difficulty comes from per-enemy HP/damage scaling instead of
  // raw spawn counts.
  const MAX_ENEMIES = 55;
  const baseCount = 10;
  const scaledCount = baseCount + Math.floor(safeStage * 0.55) + biome * 2;
  const enemyCount = Math.min(open.length, MAX_ENEMIES, scaledCount);
  const enemySpawns = Array.from({ length: enemyCount }, () => take()).filter(Boolean) as { x: number; y: number }[];

  // Scale loot slightly with stage, but cap it.
  const lootCount = Math.min(open.length, 14, 10 + Math.floor(safeStage / 10));
  const lootSpots = Array.from({ length: lootCount }, () => take()).filter(Boolean) as { x: number; y: number }[];

  // Silence unused warning in some configs.
  void isFinalStage;

  return { tiles, biome, stage: safeStage, spawn, pad, workbench, enemySpawns, bossSpawn, lootSpots };
}
