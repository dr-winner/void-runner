import Phaser from "phaser";
import { TILE, COLORS, enemyScaleForStage } from "./constants";
import { sfx } from "./audio";

export type EnemyKind = "crawler" | "spitter" | "drone" | "brute" | "miniboss" | "guardian";

export interface EnemyStats {
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  xp: number;
  range: number; // detection
  attackRange: number;
  attackCd: number;
  isBoss?: boolean;
}

export const ENEMY_PRESETS: Record<EnemyKind, Omit<EnemyStats, "hp">> = {
  crawler: { kind: "crawler", maxHp: 25, speed: 80, damage: 8, xp: 10, range: 220, attackRange: 30, attackCd: 600 },
  spitter: { kind: "spitter", maxHp: 18, speed: 55, damage: 10, xp: 14, range: 280, attackRange: 220, attackCd: 1100 },
  drone: { kind: "drone", maxHp: 14, speed: 110, damage: 6, xp: 8, range: 260, attackRange: 28, attackCd: 500 },
  brute: { kind: "brute", maxHp: 60, speed: 50, damage: 16, xp: 28, range: 200, attackRange: 36, attackCd: 900 },
  miniboss: { kind: "miniboss", maxHp: 160, speed: 65, damage: 18, xp: 80, range: 320, attackRange: 200, attackCd: 800, isBoss: true },
  guardian: { kind: "guardian", maxHp: 320, speed: 60, damage: 24, xp: 200, range: 360, attackRange: 220, attackCd: 700, isBoss: true },
};

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  stats: EnemyStats;
  hpBar: Phaser.GameObjects.Graphics;
  lastAttack = 0;
  lastHpBarDraw = 0;
  flashUntil = 0;
  baseTint = 0xffffff;
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: EnemyKind, stage = 1) {
    const preset = ENEMY_PRESETS[kind];
    const tex = `enemy_${kind === "crawler" ? "crawler" : kind === "spitter" ? "spitter" : kind === "drone" ? "drone" : kind === "brute" ? "brute" : kind === "miniboss" ? "miniboss" : "guardian"}`;
    super(scene, x, y, tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const m = enemyScaleForStage(stage);
    const maxHp = Math.ceil(preset.maxHp * m.hp);
    this.stats = {
      ...preset,
      maxHp,
      hp: maxHp,
      damage: Math.max(1, Math.ceil(preset.damage * m.damage)),
      speed: preset.speed * m.speed,
      xp: Math.max(1, Math.ceil(preset.xp * m.xp)),
    };
    this.body.setCircle(this.width / 2 - 3, 3, 3);
    this.body.setCollideWorldBounds(true);
    this.hpBar = scene.add.graphics();
    this.setDepth(5);
  }

  takeDamage(dmg: number, knockX = 0, knockY = 0) {
    this.stats.hp -= dmg;
    this.flashUntil = this.scene.time.now + 100;
    this.setTint(0xffffff);
    if (knockX || knockY) this.body.setVelocity(this.body.velocity.x + knockX, this.body.velocity.y + knockY);
    sfx.hit();
    this.lastHpBarDraw = 0;
    this.updateBar();
    return this.stats.hp <= 0;
  }

  /** Avoid redrawing HP bar every physics frame (was a major cost with many enemies). */
  updateBarIfNeeded(time: number) {
    if (time - this.lastHpBarDraw < 90) return;
    this.lastHpBarDraw = time;
    this.updateBar();
  }

  updateBar() {
    this.hpBar.clear();
    if (this.stats.hp >= this.stats.maxHp) return;
    const w = this.stats.isBoss ? 36 : 22;
    const h = 3;
    const x = this.x - w / 2;
    const y = this.y - this.height / 2 - 6;
    this.hpBar.fillStyle(0x000000, 0.7);
    this.hpBar.fillRect(x - 1, y - 1, w + 2, h + 2);
    this.hpBar.fillStyle(0x331111, 1);
    this.hpBar.fillRect(x, y, w, h);
    this.hpBar.fillStyle(this.stats.isBoss ? 0xff3355 : 0xff7755, 1);
    this.hpBar.fillRect(x, y, w * Math.max(0, this.stats.hp / this.stats.maxHp), h);
  }

  destroy(fromScene?: boolean): void {
    this.hpBar?.destroy();
    super.destroy(fromScene);
  }

  tickAI(time: number, target: Phaser.GameObjects.Sprite, onShoot: (e: Enemy) => void) {
    if (time < this.flashUntil) this.setTint(0xffaaaa);
    else this.clearTint();

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > this.stats.range && !this.stats.isBoss) {
      if (Math.random() < 0.01) {
        const a = Math.random() * Math.PI * 2;
        this.body.setVelocity(Math.cos(a) * 20, Math.sin(a) * 20);
      } else {
        this.body.setVelocity(this.body.velocity.x * 0.95, this.body.velocity.y * 0.95);
      }
      this.updateBarIfNeeded(time);
      return;
    }

    if (this.stats.kind === "spitter" || this.stats.isBoss) {
      const ideal = this.stats.attackRange * 0.7;
      const dir = dist < ideal ? -1 : 1;
      const sp = this.stats.speed * dir;
      this.body.setVelocity((dx / dist) * sp, (dy / dist) * sp);
      if (dist < this.stats.attackRange && time - this.lastAttack > this.stats.attackCd) {
        this.lastAttack = time;
        onShoot(this);
      }
    } else {
      this.body.setVelocity((dx / dist) * this.stats.speed, (dy / dist) * this.stats.speed);
    }

    this.updateBarIfNeeded(time);
  }
}
