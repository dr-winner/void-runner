import { PlayerState, createPlayerState } from "./playerState";
import { BiomeIdx, SAVE_KEY, BIOMES } from "./constants";

type Listener = () => void;

export interface GameSnapshot {
  scene: "menu" | "playing" | "gameover" | "victory";
  paused: boolean;
  inventoryOpen: boolean;
  craftingOpen: boolean;
  settingsOpen: boolean;
  player: PlayerState;
  biome: BiomeIdx;
  biomeName: string;
  shipParts: number;
  totalShipParts: 5;
  kills: number;
  runTime: number;
  seed: number;
  toast: { id: number; text: string; kind: "info" | "good" | "bad" } | null;
  bossActive: { name: string; hp: number; maxHp: number } | null;
}

class Store {
  state: GameSnapshot = {
    scene: "menu",
    paused: false,
    inventoryOpen: false,
    craftingOpen: false,
    settingsOpen: false,
    player: createPlayerState(),
    biome: 0,
    biomeName: BIOMES[0],
    shipParts: 0,
    totalShipParts: 5,
    kills: 0,
    runTime: 0,
    seed: 0,
    toast: null,
    bossActive: null,
  };
  private listeners = new Set<Listener>();
  private toastId = 0;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  emit() {
    this.listeners.forEach((l) => l());
  }
  set(patch: Partial<GameSnapshot>) {
    this.state = { ...this.state, ...patch };
    this.emit();
  }
  setPlayer(p: PlayerState) {
    this.state.player = { ...p };
    this.emit();
  }
  toast(text: string, kind: "info" | "good" | "bad" = "info") {
    this.toastId += 1;
    this.state = { ...this.state, toast: { id: this.toastId, text, kind } };
    this.emit();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.state = { ...this.state, toast: null };
      this.emit();
    }, 2200);
  }

  save() {
    try {
      const data = {
        seed: this.state.seed,
        biome: this.state.biome,
        player: this.state.player,
        kills: this.state.kills,
        runTime: this.state.runTime,
        shipParts: this.state.shipParts,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {}
  }
  load(): { seed: number; biome: BiomeIdx; player: PlayerState; kills: number; runTime: number; shipParts: number } | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  hasSave() {
    return !!localStorage.getItem(SAVE_KEY);
  }
  clearSave() {
    localStorage.removeItem(SAVE_KEY);
  }
}

export const store = new Store();
export type { Store };
