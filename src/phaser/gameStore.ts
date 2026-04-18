import { PlayerState, createPlayerState } from "./playerState";
import { BiomeIdx, SAVE_KEY, BIOMES, MAX_STAGE } from "./constants";

type Listener = () => void;

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.is((a as any)[k], (b as any)[k])) return false;
  }
  return true;
}

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
  // Emits only if any field in the patch actually differs from current state.
  // Keeps hot-path callers (e.g. per-frame runTime / boss HP updates) from
  // triggering React re-renders when nothing meaningful changed.
  setIfChanged(patch: Partial<GameSnapshot>) {
    let changed = false;
    for (const k in patch) {
      const key = k as keyof GameSnapshot;
      if (!shallowEqual((patch as any)[key], (this.state as any)[key])) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    this.state = { ...this.state, ...patch };
    this.emit();
  }
  // Produces a new root state reference so useSyncExternalStore detects the
  // change. Accepts an optional patch so callers can update other fields in
  // the same emit (e.g. bumping `kills` alongside a stat change after a
  // kill) without triggering two React renders.
  setPlayer(p: PlayerState, patch?: Partial<GameSnapshot>) {
    this.state = { ...this.state, ...patch, player: { ...p } };
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
