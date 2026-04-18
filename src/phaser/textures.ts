import Phaser from "phaser";
import { TILE, BIOME_PALETTE, BiomeIdx, TILES, COLORS } from "./constants";

// Generates pixel-art textures procedurally so we don't need image assets.
export function generateTextures(scene: Phaser.Scene) {
  for (let b = 0 as BiomeIdx; b <= 2; b = (b + 1) as BiomeIdx) {
    const p = BIOME_PALETTE[b];
    makeFloor(scene, `floor_${b}`, p.floor, p.floor2);
    makeWall(scene, `wall_${b}`, p.wall, p.accent);
  }
  makeTile(scene, "water", 0x1b3a6b, 0x2a5e9e, [[0, 4], [4, 0], [8, 12], [12, 8]]);
  makeTile(scene, "tree", 0x0a1810, 0x2c8a4a, [[6, 4], [10, 4], [14, 8], [4, 12], [16, 16]]);
  makeTile(scene, "rock", 0x2a2520, 0x6e5c4a);
  makeTile(scene, "ruin", 0x14101c, 0x6a4ca8);
  makePad(scene);
  makeWorkbench(scene);

  // Entities
  makeCircleSprite(scene, "player", 14, COLORS.neonBlue, 0xffffff);
  makeCircleSprite(scene, "enemy_crawler", 12, 0xff7755, 0xffd0c0);
  makeCircleSprite(scene, "enemy_spitter", 13, 0xb084ff, 0xe8d8ff);
  makeCircleSprite(scene, "enemy_drone", 10, COLORS.neonYellow, 0xffffff);
  makeCircleSprite(scene, "enemy_brute", 18, 0xff4477, 0xffd0e0);
  makeBossSprite(scene, "enemy_guardian", 26, 0xff3355, 0xffffff);
  makeBossSprite(scene, "enemy_miniboss", 22, 0xffaa33, 0xffffff);

  makeBullet(scene, "bullet_player", COLORS.neonBlue, 6);
  makeBullet(scene, "bullet_enemy", 0xff66aa, 6);

  makeItem(scene, "item_part", COLORS.neonGreen);
  makeItem(scene, "item_hp", COLORS.hp);
  makeItem(scene, "item_en", COLORS.energy);
  makeItem(scene, "item_weapon", COLORS.neonYellow);
  makeItem(scene, "item_armor", COLORS.neonPurple);
  makeItem(scene, "item_scrap", 0x888899);

  makeParticle(scene, "particle", 0xffffff);
  makeParticle(scene, "spark_blue", COLORS.neonBlue);
  makeParticle(scene, "spark_red", COLORS.hp);
}

function makeTile(scene: Phaser.Scene, key: string, base: number, accent: number, dots?: [number, number][]) {
  const g = scene.add.graphics();
  g.fillStyle(base, 1);
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(accent, 0.5);
  if (dots) dots.forEach(([x, y]) => g.fillRect(x, y, 4, 4));
  else {
    g.fillRect(2, 2, 6, 6);
    g.fillRect(20, 18, 4, 4);
    g.fillRect(12, 22, 5, 3);
  }
  g.generateTexture(key, TILE, TILE);
  g.destroy();
}

function makeFloor(scene: Phaser.Scene, key: string, base: number, accent: number) {
  const g = scene.add.graphics();
  g.fillStyle(base, 1);
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(accent, 0.45);
  g.fillRect(0, 0, TILE, 1);
  g.fillRect(0, 0, 1, TILE);
  // dither
  for (let i = 0; i < 6; i++) {
    g.fillStyle(accent, 0.18);
    g.fillRect((i * 7) % TILE, (i * 11) % TILE, 2, 2);
  }
  g.generateTexture(key, TILE, TILE);
  g.destroy();
}

function makeWall(scene: Phaser.Scene, key: string, base: number, accent: number) {
  const g = scene.add.graphics();
  g.fillStyle(base, 1);
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(0x000000, 0.5);
  g.fillRect(0, TILE - 4, TILE, 4);
  g.fillStyle(accent, 0.7);
  g.fillRect(0, 0, TILE, 2);
  g.fillStyle(accent, 0.25);
  g.fillRect(2, 6, TILE - 4, 2);
  g.fillRect(2, 14, TILE - 4, 2);
  g.fillRect(2, 22, TILE - 4, 2);
  g.generateTexture(key, TILE, TILE);
  g.destroy();
}

function makePad(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillStyle(0x07151c, 1);
  g.fillRect(0, 0, TILE, TILE);
  g.lineStyle(2, COLORS.neonBlue, 1);
  g.strokeCircle(TILE / 2, TILE / 2, 12);
  g.lineStyle(1, COLORS.neonBlue, 0.6);
  g.strokeCircle(TILE / 2, TILE / 2, 6);
  g.fillStyle(COLORS.neonBlue, 0.3);
  g.fillCircle(TILE / 2, TILE / 2, 4);
  g.generateTexture("pad", TILE, TILE);
  g.destroy();
}

function makeWorkbench(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillStyle(0x0a1018, 1);
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(0x4a6a8a, 1);
  g.fillRect(4, 8, 24, 16);
  g.fillStyle(COLORS.neonYellow, 1);
  g.fillRect(8, 12, 4, 4);
  g.fillStyle(COLORS.neonGreen, 1);
  g.fillRect(20, 12, 4, 4);
  g.lineStyle(1, COLORS.neonBlue, 0.6);
  g.strokeRect(4, 8, 24, 16);
  g.generateTexture("workbench", TILE, TILE);
  g.destroy();
}

function makeCircleSprite(scene: Phaser.Scene, key: string, radius: number, color: number, hilite: number) {
  const size = radius * 2 + 6;
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, size, size);
  // glow
  g.fillStyle(color, 0.25);
  g.fillCircle(size / 2, size / 2, radius + 3);
  g.fillStyle(color, 1);
  g.fillCircle(size / 2, size / 2, radius);
  g.fillStyle(hilite, 0.9);
  g.fillCircle(size / 2 - radius / 3, size / 2 - radius / 3, Math.max(2, radius / 3));
  g.lineStyle(1, 0x000000, 0.4);
  g.strokeCircle(size / 2, size / 2, radius);
  g.generateTexture(key, size, size);
  g.destroy();
}

function makeBossSprite(scene: Phaser.Scene, key: string, radius: number, color: number, hilite: number) {
  const size = radius * 2 + 10;
  const g = scene.add.graphics();
  g.fillStyle(color, 0.2);
  g.fillCircle(size / 2, size / 2, radius + 5);
  g.fillStyle(color, 1);
  // hex shape
  const cx = size / 2, cy = size / 2;
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
  }
  g.fillPoints(
    pts.reduce<{ x: number; y: number }[]>((acc, _, i, arr) => {
      if (i % 2 === 0) acc.push({ x: arr[i], y: arr[i + 1] });
      return acc;
    }, []),
    true,
  );
  g.fillStyle(hilite, 0.9);
  g.fillCircle(cx, cy, radius / 3);
  g.lineStyle(2, 0x000000, 0.4);
  g.strokeCircle(cx, cy, radius);
  g.generateTexture(key, size, size);
  g.destroy();
}

function makeBullet(scene: Phaser.Scene, key: string, color: number, radius: number) {
  const size = radius * 2 + 6;
  const g = scene.add.graphics();
  g.fillStyle(color, 0.3);
  g.fillCircle(size / 2, size / 2, radius + 2);
  g.fillStyle(color, 1);
  g.fillCircle(size / 2, size / 2, radius);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(size / 2, size / 2, Math.max(1, radius / 2.5));
  g.generateTexture(key, size, size);
  g.destroy();
}

function makeItem(scene: Phaser.Scene, key: string, color: number) {
  const size = 18;
  const g = scene.add.graphics();
  g.fillStyle(color, 0.25);
  g.fillRect(0, 0, size, size);
  g.fillStyle(color, 1);
  g.fillRect(3, 3, size - 6, size - 6);
  g.fillStyle(0xffffff, 0.8);
  g.fillRect(5, 5, 3, 3);
  g.generateTexture(key, size, size);
  g.destroy();
}

function makeParticle(scene: Phaser.Scene, key: string, color: number) {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture(key, 8, 8);
  g.destroy();
}
