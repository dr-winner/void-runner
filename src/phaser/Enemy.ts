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
  flashUntil = 0;
  baseTint = 0xffffff;
  private lastHpBarPct = 1;
  private barDirty = false;
  private tintOn = false;
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
    this.barDirty = true;
    sfx.hit();
    return this.stats.hp <= 0;
  }

  updateBar() {
    const pct = Math.max(0, this.stats.hp / this.stats.maxHp);
    if (pct >= 1) {
      // No bar to show — clear once when we transition to full HP and bail.
      if (this.lastHpBarPct < 1) {
        this.hpBar.clear();
        this.lastHpBarPct = 1;
      }
      return;
    }
    // Graphics lives at enemy position; fill coords are relative so moving
    // the enemy only requires a cheap transform, not a re-draw.
    this.hpBar.setPosition(this.x, this.y - this.height / 2 - 6);
    if (!this.barDirty && pct === this.lastHpBarPct) return;
    this.barDirty = false;
    this.lastHpBarPct = pct;
    const w = this.stats.isBoss ? 36 : 22;
    const h = 3;
    const x = -w / 2;
    this.hpBar.clear();
    this.hpBar.fillStyle(0x000000, 0.7);
    this.hpBar.fillRect(x - 1, -1, w + 2, h + 2);
    this.hpBar.fillStyle(0x331111, 1);
    this.hpBar.fillRect(x, y, w, h);
    this.hpBar.fillStyle(this.stats.isBoss ? 0xff3355 : 0xff7755, 1);
    this.hpBar.fillRect(x, 0, w * pct, h);
  }

  destroy(fromScene?: boolean): void {
    this.hpBar?.destroy();
    super.destroy(fromScene);
  }

  tickAI(time: number, target: Phaser.GameObjects.Sprite, onShoot: (e: Enemy) => void) {
    // Only toggle tint on state change — setTint/clearTint dirty GPU state.
    const wantTint = time < this.flashUntil;
    if (wantTint !== this.tintOn) {
      if (wantTint) this.setTint(0xffaaaa);
      else this.clearTint();
      this.tintOn = wantTint;
    }

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distSq = dx * dx + dy * dy;
    const rangeSq = this.stats.range * this.stats.range;

    // Far-off non-boss enemies sleep: no physics velocity churn, no bar updates.
    if (distSq > rangeSq && !this.stats.isBoss) {
      const SLEEP_SQ = 900 * 900; // ~28 tiles; well off-screen
      if (distSq > SLEEP_SQ) {
        if (this.body.velocity.x || this.body.velocity.y) this.body.setVelocity(0, 0);
        return;
      }
      if (Math.random() < 0.01) {
        const a = Math.random() * Math.PI * 2;
        this.body.setVelocity(Math.cos(a) * 20, Math.sin(a) * 20);
      } else {
        this.body.setVelocity(this.body.velocity.x * 0.95, this.body.velocity.y * 0.95);
      }
      this.updateBar();
      return;
    }

    const dist = Math.sqrt(distSq) || 1;
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

    this.updateBar();
  }
}
