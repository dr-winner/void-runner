import Phaser from "phaser";
import { GAME_W, GAME_H, COLORS } from "./constants";
import { BootScene } from "./scenes/BootScene";
import { WorldScene } from "./scenes/WorldScene";
import { UIScene } from "./scenes/UIScene";

export function createGame(parent: HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: GAME_W,
    height: GAME_H,
    backgroundColor: `#${COLORS.bg.toString(16).padStart(6, "0")}`,
    pixelArt: true,
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, WorldScene, UIScene],
    fps: { target: 60, forceSetTimeOut: false },
    render: { antialias: false, pixelArt: true, roundPixels: true },
  };
  return new Phaser.Game(config);
}
