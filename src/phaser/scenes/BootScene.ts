import Phaser from "phaser";
import { generateTextures } from "../textures";
import { unlockAudio } from "../audio";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }
  create() {
    generateTextures(this);
    unlockAudio();
    this.scene.start("World");
    this.scene.launch("UI");
  }
}
