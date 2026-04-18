import Phaser from "phaser";
import { TILE, MAP_W, MAP_H, BIOME_PALETTE, BiomeIdx, BIOMES, TILES, SOLID, COLORS, Item } from "../constants";
import { mulberry32, ri, pick, RNG } from "../rng";
import { generateMap, GeneratedMap } from "../mapgen";
import { Enemy, EnemyKind, ENEMY_PRESETS } from "../Enemy";
import { addItem, gainXp, useItem, PlayerState } from "../playerState";
import { store } from "../gameStore";
import { sfx, startAmbient, stopAmbient } from "../audio";

const FOG_RADIUS = 6;

const LOOT_TABLE: Item[] = [
  { id: "p1", name: "Plasma Cell", type: "consumable_en", value: 25 },
  { id: "p2", name: "Med Pack", type: "consumable_hp", value: 35 },
  { id: "p3", name: "Stim", type: "consumable_hp", value: 18 },
  { id: "p4", name: "Pulse Blade", type: "weapon", value: 3, tier: 1 },
  { id: "p5", name: "Nano Plate", type: "armor", value: 2, tier: 1 },
  { id: "p6", name: "Scrap", type: "scrap", value: 1 },
  { id: "p7", name: "Scrap", type: "scrap", value: 1 },
];

interface PickupSprite extends Phaser.Physics.Arcade.Sprite {
  itemData?: Item;
  isPart?: boolean;
}

export class WorldScene extends Phaser.Scene {
  rng!: RNG;
  map!: GeneratedMap;
  biome: BiomeIdx = 0;
  player!: Phaser.Physics.Arcade.Sprite & { body: Phaser.Physics.Arcade.Body };
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  walls!: Phaser.Physics.Arcade.StaticGroup;
  enemies!: Phaser.GameObjects.Group;
  pickups!: Phaser.Physics.Arcade.Group;
  playerBullets!: Phaser.Physics.Arcade.Group;
  enemyBullets!: Phaser.Physics.Arcade.Group;
  fogTexture!: Phaser.GameObjects.RenderTexture;
  fogMask!: Phaser.GameObjects.Graphics;
  visited!: boolean[][];
  lastMelee = 0;
  lastShoot = 0;
  invincibleUntil = 0;
  startTime = 0;
  damageNumbers!: Phaser.GameObjects.Group;
  bossSpawned = false;
  guardianSpawned = false;
  state!: PlayerState;
  workbenchPos = { x: 0, y: 0 };
  padPos = { x: 0, y: 0 };
  partGroup!: Phaser.Physics.Arcade.Group;
  shakeUntil = 0;

  constructor() {
    super("World");
  }

  create() {
    const save = store.load();
    const seed = save?.seed ?? Math.floor(Math.random() * 1e9);
    const biome: BiomeIdx = (save?.biome ?? 0) as BiomeIdx;
    this.rng = mulberry32(seed);
    this.biome = biome;
    this.map = generateMap(this.rng, biome);

    this.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    this.cameras.main.setBackgroundColor(BIOME_PALETTE[biome].ambient);
    this.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);

    this.drawTerrain();
    this.walls = this.physics.add.staticGroup();
    this.buildColliders();

    this.state = save?.player ?? store.state.player;
    store.set({
      seed,
      biome,
      biomeName: BIOMES[biome],
      shipParts: save?.shipParts ?? 0,
      kills: save?.kills ?? 0,
      runTime: save?.runTime ?? 0,
      scene: "playing",
      bossActive: null,
    });
    store.setPlayer(this.state);

    // Player
    const sx = this.map.spawn.x * TILE + TILE / 2;
    const sy = this.map.spawn.y * TILE + TILE / 2;
    this.player = this.physics.add.sprite(sx, sy, "player") as any;
    this.player.body.setCircle(this.player.width / 2 - 4, 4, 4);
    this.player.body.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    // Groups
    this.enemies = this.add.group({ runChildUpdate: false });
    this.pickups = this.physics.add.group();
    this.partGroup = this.physics.add.group();
    this.playerBullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.damageNumbers = this.add.group();

    // Spawn entities
    this.map.enemySpawns.forEach((p) => {
      const kinds: EnemyKind[] = ["crawler", "spitter", "drone", "brute"];
      const weights = [0.4, 0.3, 0.2, 0.1];
      const r = this.rng();
      let acc = 0;
      let kind: EnemyKind = "crawler";
      for (let i = 0; i < kinds.length; i++) {
        acc += weights[i];
        if (r < acc) { kind = kinds[i]; break; }
      }
      this.spawnEnemy(p.x * TILE + TILE / 2, p.y * TILE + TILE / 2, kind);
    });
    // Mini-boss for the biome
    this.spawnEnemy(this.map.miniBoss.x * TILE + TILE / 2, this.map.miniBoss.y * TILE + TILE / 2, "miniboss");

    // Loot
    this.map.lootSpots.forEach((p) => {
      const item = pick(this.rng, LOOT_TABLE);
      this.spawnPickup(p.x * TILE + TILE / 2, p.y * TILE + TILE / 2, { ...item }, false);
    });
    // Ship parts
    this.map.shipParts.forEach((p) => {
      this.spawnPickup(p.x * TILE + TILE / 2, p.y * TILE + TILE / 2, { id: "part", name: "Ship Part", type: "ship_part", value: 1 }, true);
    });

    this.padPos = { x: this.map.pad.x * TILE + TILE / 2, y: this.map.pad.y * TILE + TILE / 2 };
    this.workbenchPos = { x: this.map.workbench.x * TILE + TILE / 2, y: this.map.workbench.y * TILE + TILE / 2 };

    // Colliders
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.player, this.pickups, this.onPickup, undefined, this);
    this.physics.add.overlap(this.player, this.partGroup, this.onPartPickup, undefined, this);
    this.physics.add.overlap(this.playerBullets, this.enemies, this.onBulletHitEnemy as any, undefined, this);
    this.physics.add.collider(this.playerBullets, this.walls, (b: any) => b.destroy());
    this.physics.add.overlap(this.enemyBullets, this.player, this.onEnemyBulletHit as any, undefined, this);
    this.physics.add.collider(this.enemyBullets, this.walls, (b: any) => b.destroy());
    this.physics.add.overlap(this.player, this.enemies, this.onEnemyTouch as any, undefined, this);

    // Fog of war
    this.visited = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false));
    this.fogTexture = this.add.renderTexture(0, 0, MAP_W * TILE, MAP_H * TILE).setDepth(50).setOrigin(0, 0);
    this.fogTexture.fill(0x000000, 0.95);
    this.fogMask = this.make.graphics({ x: 0, y: 0 }, false);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,SPACE,F,E,I,C,P,ESC,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT,NINE,ZERO") as any;
    this.input.mouse?.disableContextMenu();
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (store.state.paused || store.state.scene !== "playing") return;
      if (p.leftButtonDown()) this.tryMelee();
      if (p.rightButtonDown()) this.tryShoot();
    });

    this.startTime = this.time.now - (save?.runTime ?? 0) * 1000;
    startAmbient(biome);

    // periodic save
    this.time.addEvent({ delay: 5000, loop: true, callback: () => store.save() });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      stopAmbient();
    });

    // Screen reveal initial fog
    this.updateFog();
  }

  drawTerrain() {
    const p = BIOME_PALETTE[this.biome];
    const g = this.add.graphics().setDepth(0);
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = this.map.tiles[y][x];
        let key = `floor_${this.biome}`;
        if (t === TILES.WALL) key = `wall_${this.biome}`;
        else if (t === TILES.WATER) key = "water";
        else if (t === TILES.TREE) key = "tree";
        else if (t === TILES.ROCK) key = "rock";
        else if (t === TILES.RUIN) key = "ruin";
        else if (t === TILES.PAD) key = "pad";
        else if (t === TILES.WORKBENCH) key = "workbench";
        // draw floor under solid decorations
        if (t === TILES.TREE || t === TILES.ROCK || t === TILES.RUIN || t === TILES.WATER || t === TILES.PAD || t === TILES.WORKBENCH) {
          this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, `floor_${this.biome}`).setDepth(0);
        }
        this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, key).setDepth(t === TILES.PAD || t === TILES.WORKBENCH ? 1 : 0);
      }
    }
    g.destroy();
  }

  buildColliders() {
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (SOLID.has(this.map.tiles[y][x])) {
          const r = this.walls.create(x * TILE + TILE / 2, y * TILE + TILE / 2, `wall_${this.biome}`);
          r.setVisible(false).refreshBody();
        }
      }
    }
  }

  spawnEnemy(x: number, y: number, kind: EnemyKind) {
    const e = new Enemy(this, x, y, kind);
    this.enemies.add(e);
    return e;
  }

  spawnPickup(x: number, y: number, item: Item, isPart: boolean) {
    const tex =
      item.type === "ship_part" ? "item_part" :
      item.type === "consumable_hp" ? "item_hp" :
      item.type === "consumable_en" ? "item_en" :
      item.type === "weapon" ? "item_weapon" :
      item.type === "armor" ? "item_armor" : "item_scrap";
    const s = this.physics.add.sprite(x, y, tex) as PickupSprite;
    s.itemData = item;
    s.isPart = isPart;
    s.setDepth(3);
    (s.body as Phaser.Physics.Arcade.Body).setCircle(8, 1, 1);
    this.tweens.add({ targets: s, y: y - 4, yoyo: true, duration: 800, repeat: -1, ease: "sine.inOut" });
    if (isPart) {
      this.partGroup.add(s);
      // glow ring
      const ring = this.add.circle(x, y, 14, COLORS.neonGreen, 0.18).setDepth(2);
      this.tweens.add({ targets: ring, radius: 20, alpha: 0, duration: 1200, repeat: -1 });
      (s as any).ring = ring;
    } else {
      this.pickups.add(s);
    }
  }

  onPickup(_player: any, pickup: any) {
    const ps = pickup as PickupSprite;
    const item = ps.itemData!;
    if (!addItem(this.state, item)) {
      store.toast("Inventory full", "bad");
      return;
    }
    sfx.pickup();
    this.popText(ps.x, ps.y, `+ ${item.name}`, COLORS.neonGreen);
    ps.destroy();
    store.setPlayer(this.state);
  }

  onPartPickup(_player: any, pickup: any) {
    const ps = pickup as PickupSprite;
    sfx.pickup();
    (ps as any).ring?.destroy();
    ps.destroy();
    const next = store.state.shipParts + 1;
    store.set({ shipParts: next });
    store.toast(`Ship Part ${next}/5 collected`, "good");
    this.popText(ps.x, ps.y, "SHIP PART", COLORS.neonGreen);
    this.cameras.main.flash(180, 0, 255, 120);
    if (next >= 5 && !this.guardianSpawned) {
      this.spawnGuardian();
    }
  }

  spawnGuardian() {
    this.guardianSpawned = true;
    sfx.boss();
    const e = this.spawnEnemy(this.padPos.x + 64, this.padPos.y, "guardian");
    store.toast("⚠ The Guardian awakens at the escape pod!", "bad");
    this.cameras.main.shake(400, 0.01);
    store.set({ bossActive: { name: "GUARDIAN", hp: e.stats.hp, maxHp: e.stats.maxHp } });
  }

  onBulletHitEnemy(bullet: any, enemy: any) {
    const e = enemy as Enemy;
    bullet.destroy();
    const dmg = this.state.attack + ri(this.rng, 0, 4);
    this.popText(e.x, e.y - 12, `${dmg}`, COLORS.neonYellow);
    if (e.takeDamage(dmg, (e.x - this.player.x) * 0.4, (e.y - this.player.y) * 0.4)) {
      this.killEnemy(e);
    } else if (e.stats.isBoss) {
      store.set({ bossActive: { name: e.stats.kind === "guardian" ? "GUARDIAN" : "BIOME WARDEN", hp: e.stats.hp, maxHp: e.stats.maxHp } });
    }
  }

  onEnemyBulletHit(bullet: any) {
    if (this.time.now < this.invincibleUntil) return;
    bullet.destroy();
    this.damagePlayer(8 + ri(this.rng, 0, 4));
  }

  onEnemyTouch(_p: any, enemy: any) {
    if (this.time.now < this.invincibleUntil) return;
    const e = enemy as Enemy;
    if (e.stats.kind === "spitter") return; // spitters shoot, no contact dmg
    this.damagePlayer(e.stats.damage);
  }

  damagePlayer(raw: number) {
    const dmg = Math.max(1, raw - this.state.defense);
    this.state.hp = Math.max(0, this.state.hp - dmg);
    this.invincibleUntil = this.time.now + 400;
    this.cameras.main.shake(160, 0.012);
    this.cameras.main.flash(80, 255, 50, 60);
    this.popText(this.player.x, this.player.y - 14, `-${dmg}`, COLORS.hp);
    sfx.hit();
    store.setPlayer(this.state);
    if (this.state.hp <= 0) {
      this.gameOver();
    }
  }

  killEnemy(e: Enemy) {
    const xp = e.stats.xp;
    const isBoss = !!e.stats.isBoss;
    const wasGuardian = e.stats.kind === "guardian";
    // particles
    const emitter = this.add.particles(e.x, e.y, "spark_red", {
      speed: { min: 60, max: 200 },
      lifespan: 500,
      quantity: isBoss ? 30 : 12,
      scale: { start: 1, end: 0 },
      blendMode: "ADD",
    });
    this.time.delayedCall(600, () => emitter.destroy());
    if (isBoss) {
      this.cameras.main.shake(400, 0.02);
      // Guaranteed loot
      this.spawnPickup(e.x, e.y, { id: "drop", name: "Pulse Blade", type: "weapon", value: 5, tier: 2 }, false);
      this.spawnPickup(e.x + 12, e.y, { id: "drop", name: "Med Pack+", type: "consumable_hp", value: 50 }, false);
      store.set({ bossActive: null });
    } else if (this.rng() < 0.35) {
      this.spawnPickup(e.x, e.y, { ...pick(this.rng, LOOT_TABLE) }, false);
    }
    e.destroy();
    store.set({ kills: store.state.kills + 1 });
    if (gainXp(this.state, xp)) {
      sfx.levelup();
      store.toast(`LEVEL UP! +2 stat points`, "good");
      this.cameras.main.flash(250, 80, 200, 255);
    }
    store.setPlayer(this.state);
    if (wasGuardian) {
      this.victory();
    }
  }

  popText(x: number, y: number, text: string, color: number) {
    const t = this.add.text(x, y, text, {
      fontFamily: "monospace",
      fontSize: "12px",
      color: `#${color.toString(16).padStart(6, "0")}`,
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({
      targets: t,
      y: y - 24,
      alpha: 0,
      duration: 700,
      onComplete: () => t.destroy(),
    });
  }

  tryMelee() {
    if (this.time.now - this.lastMelee < 280) return;
    this.lastMelee = this.time.now;
    sfx.shoot();
    const ang = this.player.rotation;
    const reach = 38;
    const tx = this.player.x + Math.cos(ang) * reach;
    const ty = this.player.y + Math.sin(ang) * reach;
    // arc visual
    const arc = this.add.circle(tx, ty, 22, COLORS.neonBlue, 0.35).setDepth(11);
    this.tweens.add({ targets: arc, alpha: 0, scale: 1.4, duration: 200, onComplete: () => arc.destroy() });
    this.enemies.getChildren().forEach((c) => {
      const e = c as Enemy;
      if (Phaser.Math.Distance.Between(e.x, e.y, tx, ty) < 26) {
        const dmg = this.state.attack + ri(this.rng, 1, 5);
        this.popText(e.x, e.y - 10, `${dmg}`, COLORS.neonBlue);
        if (e.takeDamage(dmg, (e.x - this.player.x) * 0.6, (e.y - this.player.y) * 0.6)) this.killEnemy(e);
        else if (e.stats.isBoss) store.set({ bossActive: { name: e.stats.kind === "guardian" ? "GUARDIAN" : "BIOME WARDEN", hp: e.stats.hp, maxHp: e.stats.maxHp } });
      }
    });
  }

  tryShoot() {
    if (this.time.now - this.lastShoot < 220) return;
    if (this.state.energy < 5) {
      store.toast("Out of energy", "bad");
      return;
    }
    this.lastShoot = this.time.now;
    this.state.energy -= 5;
    store.setPlayer(this.state);
    sfx.shoot();
    const ang = this.player.rotation;
    const speed = 460;
    const b = this.playerBullets.create(this.player.x + Math.cos(ang) * 14, this.player.y + Math.sin(ang) * 14, "bullet_player") as Phaser.Physics.Arcade.Sprite;
    b.setDepth(8);
    (b.body as Phaser.Physics.Arcade.Body).setCircle(5, 1, 1);
    b.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
    this.time.delayedCall(1100, () => b.destroy());
  }

  enemyShoot(e: Enemy) {
    const ang = Math.atan2(this.player.y - e.y, this.player.x - e.x);
    const speed = 240;
    const b = this.enemyBullets.create(e.x, e.y, "bullet_enemy") as Phaser.Physics.Arcade.Sprite;
    b.setDepth(8);
    (b.body as Phaser.Physics.Arcade.Body).setCircle(5, 1, 1);
    b.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
    sfx.enemyShoot();
    this.time.delayedCall(1500, () => b.destroy());
    // boss spread
    if (e.stats.isBoss) {
      [-0.25, 0.25].forEach((off) => {
        const a2 = ang + off;
        const b2 = this.enemyBullets.create(e.x, e.y, "bullet_enemy") as Phaser.Physics.Arcade.Sprite;
        b2.setDepth(8);
        (b2.body as Phaser.Physics.Arcade.Body).setCircle(5, 1, 1);
        b2.setVelocity(Math.cos(a2) * speed, Math.sin(a2) * speed);
        this.time.delayedCall(1500, () => b2.destroy());
      });
    }
  }

  updateFog() {
    const px = Math.floor(this.player.x / TILE);
    const py = Math.floor(this.player.y / TILE);
    let dirty = false;
    for (let dy = -FOG_RADIUS; dy <= FOG_RADIUS; dy++) {
      for (let dx = -FOG_RADIUS; dx <= FOG_RADIUS; dx++) {
        if (dx * dx + dy * dy > FOG_RADIUS * FOG_RADIUS) continue;
        const x = px + dx, y = py + dy;
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
        if (!this.visited[y][x]) {
          this.visited[y][x] = true;
          dirty = true;
        }
      }
    }
    if (dirty) {
      this.fogTexture.clear();
      this.fogTexture.fill(0x000000, 0.92);
      this.fogMask.clear();
      this.fogMask.fillStyle(0x000000, 1);
      for (let y = 0; y < MAP_H; y++) {
        for (let x = 0; x < MAP_W; x++) {
          if (this.visited[y][x]) this.fogMask.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
      }
      // bright window around player
      this.fogMask.fillCircle(this.player.x, this.player.y, FOG_RADIUS * TILE * 0.95);
      this.fogTexture.erase(this.fogMask);
    }
  }

  update(time: number, _delta: number) {
    if (store.state.paused || store.state.scene !== "playing") {
      this.player.body.setVelocity(0, 0);
      return;
    }
    // movement
    let vx = 0, vy = 0;
    const k = this.keys;
    if (this.cursors.left?.isDown || k.A.isDown) vx -= 1;
    if (this.cursors.right?.isDown || k.D.isDown) vx += 1;
    if (this.cursors.up?.isDown || k.W.isDown) vy -= 1;
    if (this.cursors.down?.isDown || k.S.isDown) vy += 1;
    const len = Math.hypot(vx, vy) || 1;
    this.player.body.setVelocity((vx / len) * this.state.speed, (vy / len) * this.state.speed);

    // face mouse
    const p = this.input.activePointer;
    const wp = p.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
    this.player.rotation = Math.atan2(wp.y - this.player.y, wp.x - this.player.x);

    // hotkeys
    if (Phaser.Input.Keyboard.JustDown(k.SPACE)) this.tryMelee();
    if (Phaser.Input.Keyboard.JustDown(k.F)) this.tryShoot();
    if (Phaser.Input.Keyboard.JustDown(k.I)) store.set({ inventoryOpen: !store.state.inventoryOpen, paused: !store.state.inventoryOpen });
    if (Phaser.Input.Keyboard.JustDown(k.ESC)) store.set({ paused: !store.state.paused, settingsOpen: !store.state.paused });
    if (Phaser.Input.Keyboard.JustDown(k.E)) this.tryInteract();
    // hotbar
    const hotKeys = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "ZERO"];
    hotKeys.forEach((kk, i) => {
      if (Phaser.Input.Keyboard.JustDown(k[kk])) this.useHotbar(i);
    });

    // energy regen
    this.state.energy = Math.min(this.state.maxEnergy, this.state.energy + 0.04);
    if ((time | 0) % 30 === 0) store.setPlayer(this.state);

    // enemy AI
    this.enemies.getChildren().forEach((c) => {
      const e = c as Enemy;
      e.tickAI(time, this.player, (en) => this.enemyShoot(en));
      if (e.stats.isBoss) {
        store.set({ bossActive: { name: e.stats.kind === "guardian" ? "GUARDIAN" : "BIOME WARDEN", hp: e.stats.hp, maxHp: e.stats.maxHp } });
      }
    });
    if (!this.enemies.getChildren().some((c) => (c as Enemy).stats.isBoss)) {
      if (store.state.bossActive) store.set({ bossActive: null });
    }

    this.updateFog();
    store.set({ runTime: Math.floor((time - this.startTime) / 1000) });
  }

  tryInteract() {
    // workbench
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.workbenchPos.x, this.workbenchPos.y) < 40) {
      store.set({ craftingOpen: true, paused: true, inventoryOpen: false });
      return;
    }
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.padPos.x, this.padPos.y) < 40) {
      if (store.state.shipParts >= 5 && this.guardianSpawned && !this.enemies.getChildren().some((c) => (c as Enemy).stats.kind === "guardian")) {
        this.victory();
      } else if (store.state.shipParts < 5) {
        store.toast(`Need all 5 ship parts (${store.state.shipParts}/5)`, "info");
      } else if (this.enemies.getChildren().some((c) => (c as Enemy).stats.kind === "guardian")) {
        store.toast("Defeat the Guardian first!", "bad");
      }
    }
  }

  useHotbar(i: number) {
    const slot = this.state.hotbar[i];
    if (slot === null || slot === undefined) return;
    const r = useItem(this.state, slot);
    if (r.used) {
      sfx.pickup();
      if (r.msg) store.toast(r.msg, "good");
      store.setPlayer(this.state);
    }
  }

  gameOver() {
    sfx.die();
    store.set({ scene: "gameover", paused: true });
    store.clearSave();
  }
  victory() {
    sfx.victory();
    store.set({ scene: "victory", paused: true });
    store.clearSave();
  }
}
