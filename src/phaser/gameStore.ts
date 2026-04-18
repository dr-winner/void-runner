import { PlayerState, createPlayerState } from "./playerState";
import { BiomeIdx, SAVE_KEY, BIOMES, MAX_STAGE } from "./constants";

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
  stage: number;
  maxStage: number;
  stageCleared: boolean;
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
    stage: 1,
    maxStage: MAX_STAGE,
    stageCleared: false,
    kills: 0,
    runTime: 0,
    seed: 0,
    toast: null,
    bossActive: null,
  };
  private listeners = new Set<Listener>();
  private toastId = 0;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  /** Coalesce many store updates in one frame into a single React reconciliation. */
  private emitPending = false;

  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  emit() {
    if (this.emitPending) return;
    this.emitPending = true;
    const flush = () => {
      this.emitPending = false;
      this.listeners.forEach((l) => l());
    };
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(flush);
    } else {
      queueMicrotask(flush);
    }
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
        stage: this.state.stage,
        player: this.state.player,
        kills: this.state.kills,
        runTime: this.state.runTime,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {}
  }
  load(): { seed: number; stage: number; player: PlayerState; kills: number; runTime: number } | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.stage !== "number") return null;
      return parsed;
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
