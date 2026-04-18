import Phaser from "phaser";
import { TILE, MAP_W, MAP_H, BIOME_PALETTE } from "../constants";
import { store } from "../gameStore";

// Tiny minimap rendered as a Phaser scene overlay.
export class UIScene extends Phaser.Scene {
  rt!: Phaser.GameObjects.RenderTexture;
  scratch!: Phaser.GameObjects.Graphics;
  minimapTiles!: Phaser.GameObjects.Graphics;
  lastDraw = 0;
  lastEnemyPoll = 0;
  lastEnemyHash = 0;
  visitedDrawnCount = 0;
  lastPlayerTileX = -1;
  lastPlayerTileY = -1;
  private resizeHandler?: () => void;

  constructor() {
    super("UI");
  }

  create() {
    const w = 180, h = 130;
    const x = this.scale.width - w - 16;
    const y = 16;
    this.add.rectangle(x - 4, y - 4, w + 8, h + 8, 0x000000, 0.5).setOrigin(0).setStrokeStyle(1, 0x33d9ff, 0.6);
    this.rt = this.add.renderTexture(x, y, w, h).setOrigin(0);
    // Static minimap tiles; append-only as exploration grows.
    this.minimapTiles = this.make.graphics({ x: 0, y: 0 }, false);
    // Single persistent Graphics reused for dynamic markers.
    this.scratch = this.make.graphics({ x: 0, y: 0 }, false);
    this.resizeHandler = () => this.relayout();
    this.scale.on("resize", this.resizeHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.onShutdown, this);
    this.rt.fill(0x05070d, 1);
  }

  relayout() {
    const w = 180, h = 130;
    const x = this.scale.width - w - 16;
    const y = 16;
    this.rt.setPosition(x, y);
  }

  update(time: number) {
    const world = this.scene.get("World") as any;
    if (!world?.map || !world.player) return;

    const w = this.rt.width, h = this.rt.height;
    const sx = w / (MAP_W * TILE);
    const sy = h / (MAP_H * TILE);
    const tileW = Math.max(1, TILE * sx);
    const tileH = Math.max(1, TILE * sy);
    const p = BIOME_PALETTE[world.biome as 0 | 1 | 2];

    const visitedList = world.visitedList as Array<{ x: number; y: number }> | undefined;
    let minimapDirty = false;
    if (visitedList && this.visitedDrawnCount < visitedList.length) {
      for (let i = this.visitedDrawnCount; i < visitedList.length; i++) {
        const cell = visitedList[i];
        const t = world.map.tiles[cell.y][cell.x];
        let color = p.floor;
        if (t === 1) color = p.wall;
        else if (t === 6) color = 0x33d9ff;
        else if (t === 7) color = 0xffd633;
        this.minimapTiles.fillStyle(color, 1);
        this.minimapTiles.fillRect(cell.x * TILE * sx, cell.y * TILE * sy, tileW, tileH);
      }
      this.visitedDrawnCount = visitedList.length;
      minimapDirty = true;
    }

    const playerTileX = Math.floor(world.player.x / TILE);
    const playerTileY = Math.floor(world.player.y / TILE);
    if (playerTileX !== this.lastPlayerTileX || playerTileY !== this.lastPlayerTileY) {
      this.lastPlayerTileX = playerTileX;
      this.lastPlayerTileY = playerTileY;
      minimapDirty = true;
    }

    // Poll enemy movement at a lower cadence; minimap is non-critical UI.
    if (time - this.lastEnemyPoll >= 240) {
      this.lastEnemyPoll = time;
      let hash = 0;
      const enemies = world.enemies?.getChildren?.() as any[] | undefined;
      if (enemies) {
        for (let i = 0; i < enemies.length; i++) {
          const e = enemies[i];
          hash = (hash + ((e.x / 8) | 0) * 31 + ((e.y / 8) | 0) * 17) | 0;
        }
      }
      if (hash !== this.lastEnemyHash) {
        this.lastEnemyHash = hash;
        minimapDirty = true;
      }
    }

    if (!minimapDirty && time - this.lastDraw < 240) return;
    this.lastDraw = time;

    const g = this.scratch;
    g.clear();
    this.rt.clear();
    this.rt.fill(0x05070d, 1);
    this.rt.draw(this.minimapTiles);

    const enemies = world.enemies?.getChildren?.() as any[] | undefined;
    if (enemies) {
      for (let i = 0; i < enemies.length; i++) {
        const c = enemies[i];
        const vy = Math.floor(c.y / TILE);
        const vx = Math.floor(c.x / TILE);
        if (!world.visited[vy]?.[vx]) continue;
        g.fillStyle(c.stats?.isBoss ? 0xffaa33 : 0xff5566, 1);
        g.fillCircle(c.x * sx, c.y * sy, c.stats?.isBoss ? 3 : 2);
      }
    }

    g.fillStyle(0x33d9ff, 1);
    g.fillCircle(world.player.x * sx, world.player.y * sy, 3);
    this.rt.draw(g);

    void store;
  }

  private onShutdown() {
    if (this.resizeHandler) {
      this.scale.off("resize", this.resizeHandler);
      this.resizeHandler = undefined;
    }
    this.rt?.destroy();
    this.scratch?.destroy();
    this.minimapTiles?.destroy();
  }
}
