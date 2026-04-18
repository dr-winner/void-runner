export const GAME_W = 1280;
export const GAME_H = 720;
export const TILE = 32;
export const MAP_W = 80;
export const MAP_H = 60;

export const SAVE_KEY = "voidrunner_save_v3";

export const BIOMES = ["CRASHED ZONE", "ALIEN JUNGLE", "UNDERGROUND RUINS"] as const;
export type BiomeIdx = 0 | 1 | 2;

export const MAX_STAGE = 100;
export const BOSS_STAGE_INTERVAL = 10;

export function biomeForStage(stage: number): BiomeIdx {
  const s = Math.max(1, Math.min(MAX_STAGE, stage));
  if (s <= 33) return 0;
  if (s <= 66) return 1;
  return 2;
}

export function isBossStage(stage: number): boolean {
  return stage % BOSS_STAGE_INTERVAL === 0 || stage === MAX_STAGE;
}

export function isFinalStage(stage: number): boolean {
  return stage >= MAX_STAGE;
}

// Per-stage scaling multipliers applied to enemy presets.
export function enemyScaleForStage(stage: number) {
  const s = Math.max(1, stage);
  return {
    hp: 1 + (s - 1) * 0.09,
    damage: 1 + (s - 1) * 0.055,
    speed: Math.min(1.8, 1 + (s - 1) * 0.008),
    xp: 1 + (s - 1) * 0.07,
  };
}

// Tailwind-tokenized neon palette mirrored as hex for Phaser
export const COLORS = {
  bg: 0x05070d,
  neonBlue: 0x33d9ff,
  neonGreen: 0x4ee37a,
  neonPurple: 0xb084ff,
  neonYellow: 0xffd633,
  hp: 0xff5566,
  energy: 0x33d9ff,
  fog: 0x000000,
};

export const BIOME_PALETTE: Record<BiomeIdx, { floor: number; floor2: number; wall: number; accent: number; ambient: number }> = {
  0: { floor: 0x1a1d28, floor2: 0x232734, wall: 0x4a342d, accent: 0xb4783c, ambient: 0x1a1410 },
  1: { floor: 0x0d1f17, floor2: 0x132a1f, wall: 0x174a30, accent: 0x50c882, ambient: 0x0a1a12 },
  2: { floor: 0x110e1c, floor2: 0x191429, wall: 0x382c5a, accent: 0xa064dc, ambient: 0x14101e },
};

export const TILES = {
  FLOOR: 0,
  WALL: 1,
  WATER: 2,
  TREE: 3,
  ROCK: 4,
  RUIN: 5,
  PAD: 6,
  WORKBENCH: 7,
} as const;

export const SOLID = new Set<number>([TILES.WALL, TILES.TREE, TILES.ROCK, TILES.RUIN]);

export type ItemType = "weapon" | "armor" | "consumable_hp" | "consumable_en" | "ship_part" | "scrap";
export interface Item {
  id: string;
  name: string;
  type: ItemType;
  value: number;
  tier?: number;
}
