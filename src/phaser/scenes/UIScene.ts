import Phaser from "phaser";
import { TILE, MAP_W, MAP_H, BIOME_PALETTE } from "../constants";
import { store } from "../gameStore";

// Tiny minimap rendered as a Phaser scene overlay.
export class UIScene extends Phaser.Scene {
  rt!: Phaser.GameObjects.RenderTexture;
  marker!: Phaser.GameObjects.Graphics;
  lastDraw = 0;

  constructor() {
    super("UI");
  }

  create() {
    const w = 180, h = 130;
    const x = this.scale.width - w - 16;
    const y = 16;
    this.add.rectangle(x - 4, y - 4, w + 8, h + 8, 0x000000, 0.5).setOrigin(0).setStrokeStyle(1, 0x33d9ff, 0.6);
    this.rt = this.add.renderTexture(x, y, w, h).setOrigin(0);
    this.marker = this.add.graphics();
    this.scale.on("resize", () => this.relayout());
  }

  relayout() {
    const w = 180, h = 130;
    const x = this.scale.width - w - 16;
    const y = 16;
    this.rt.setPosition(x, y);
  }

  update(time: number) {
    if (time - this.lastDraw < 250) return;
    this.lastDraw = time;
    const world = this.scene.get("World") as any;
    if (!world?.map || !world.player) return;
    const w = this.rt.width, h = this.rt.height;
    const sx = w / (MAP_W * TILE);
    const sy = h / (MAP_H * TILE);
    this.rt.clear();
    this.rt.fill(0x05070d, 1);
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const p = BIOME_PALETTE[world.biome as 0 | 1 | 2];
    for (let yy = 0; yy < MAP_H; yy++) {
      for (let xx = 0; xx < MAP_W; xx++) {
        if (!world.visited[yy][xx]) continue;
        const t = world.map.tiles[yy][xx];
        let color = p.floor;
        if (t === 1) color = p.wall;
        else if (t === 6) color = 0x33d9ff;
        else if (t === 7) color = 0xffd633;
        g.fillStyle(color, 1);
        g.fillRect(xx * TILE * sx, yy * TILE * sy, Math.max(1, TILE * sx), Math.max(1, TILE * sy));
      }
    }
    // ship parts
    world.partGroup.getChildren().forEach((c: any) => {
      g.fillStyle(0x4ee37a, 1);
      g.fillCircle(c.x * sx, c.y * sy, 2);
    });
    // enemies in fov
    world.enemies.getChildren().forEach((c: any) => {
      if (!world.visited[Math.floor(c.y / TILE)]?.[Math.floor(c.x / TILE)]) return;
      g.fillStyle(c.stats?.isBoss ? 0xffaa33 : 0xff5566, 1);
      g.fillCircle(c.x * sx, c.y * sy, c.stats?.isBoss ? 3 : 2);
    });
    // player
    g.fillStyle(0x33d9ff, 1);
    g.fillCircle(world.player.x * sx, world.player.y * sy, 3);
    this.rt.draw(g);
    g.destroy();

    // store snapshot of minimap not needed; React reads its own minimap? No, we render in Phaser.
    void store;
  }
}
