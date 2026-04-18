import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { createGame } from "@/phaser/createGame";
import { store } from "@/phaser/gameStore";
import { createPlayerState } from "@/phaser/playerState";
import { HUD } from "@/phaser/ui/HUD";
import { InventoryPanel } from "@/phaser/ui/InventoryPanel";
import { CraftingPanel } from "@/phaser/ui/CraftingPanel";
import { SettingsPanel } from "@/phaser/ui/SettingsPanel";
import { EndScreen } from "@/phaser/ui/EndScreen";
import { MainMenu } from "@/phaser/ui/MainMenu";

const VoidRunner = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [showMenu, setShowMenu] = useState(true);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    document.title = "VOID RUNNER · Sci-Fi Survival RPG";
    setHasSave(store.hasSave());
  }, []);

  const startGame = (continueRun: boolean) => {
    if (!continueRun) {
      store.clearSave();
      store.set({
        player: createPlayerState(),
        kills: 0,
        runTime: 0,
        stage: 1,
        stageCleared: false,
        bossActive: null,
        objective: "Find and activate the portal.",
        stageModifierLabel: null,
        debugOverlay: false,
        debugStats: null,
        seed: Math.floor(Math.random() * 1e9),
      });
    }
    setShowMenu(false);
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
    if (mountRef.current) {
      gameRef.current = createGame(mountRef.current);
    }
  };

  const restart = () => {
    store.clearSave();
    setHasSave(false);
    setShowMenu(true);
    store.set({
      scene: "menu",
      paused: false,
      inventoryOpen: false,
      craftingOpen: false,
      settingsOpen: false,
      objective: "Find and activate the portal.",
      stageModifierLabel: null,
      debugOverlay: false,
      debugStats: null,
    });
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
  };

  useEffect(() => () => {
    if (gameRef.current) {
      store.save();
      gameRef.current.destroy(true);
    }
  }, []);

  // periodic save
  useEffect(() => {
    const id = setInterval(() => {
      if (store.state.scene === "playing") store.save();
    }, 5000);
    const beforeUnload = () => store.save();
    window.addEventListener("beforeunload", beforeUnload);
    return () => { clearInterval(id); window.removeEventListener("beforeunload", beforeUnload); };
  }, []);

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center gap-4 px-3 py-6 bg-[radial-gradient(ellipse_at_center,_hsl(var(--neon-purple)/0.08),_transparent_70%)]">
      <div
        className="relative rounded-2xl overflow-hidden border border-[hsl(var(--neon-blue)/0.4)] shadow-[0_0_80px_hsl(var(--neon-purple)/0.28),0_0_36px_hsl(var(--neon-blue)/0.18)_inset] bg-background ring-1 ring-white/5"
        style={{ width: "min(100%, 1280px)", aspectRatio: "16 / 9" }}
      >
        <div ref={mountRef} className="w-full h-full [&_canvas]:block" />
        {!showMenu && <HUD />}
        <InventoryPanel />
        <CraftingPanel />
        <SettingsPanel onRestart={restart} />
        <EndScreen onRestart={restart} />
        {showMenu && <MainMenu hasSave={hasSave} onContinue={() => startGame(true)} onNew={() => startGame(false)} />}
      </div>
      {!showMenu && (
        <div className="w-full max-w-[1280px] rounded-lg border border-border/30 bg-background/40 px-3 py-2.5 font-mono text-[10px] text-foreground/55 sm:text-[11px]">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 tracking-wide">
            <span><kbd className="rounded border border-border/60 bg-background/80 px-1.5 py-0.5 text-foreground/80">WASD</kbd> move</span>
            <span><kbd className="rounded border border-border/60 bg-background/80 px-1.5 py-0.5">LMB</kbd> / <kbd className="rounded border border-border/60 bg-background/80 px-1">Space</kbd> melee</span>
            <span><kbd className="rounded border border-border/60 bg-background/80 px-1.5 py-0.5">RMB</kbd> / <kbd className="rounded border border-border/60 bg-background/80 px-1">F</kbd> shoot</span>
            <span><kbd className="rounded border border-border/60 bg-background/80 px-1.5 py-0.5">I</kbd> inventory</span>
            <span><kbd className="rounded border border-border/60 bg-background/80 px-1.5 py-0.5">E</kbd> interact</span>
            <span><kbd className="rounded border border-border/60 bg-background/80 px-1.5 py-0.5">C</kbd> stats</span>
            <span><kbd className="rounded border border-border/60 bg-background/80 px-1.5 py-0.5">P</kbd> debug</span>
            <span><kbd className="rounded border border-border/60 bg-background/80 px-1.5 py-0.5">Esc</kbd> pause</span>
            <span><kbd className="rounded border border-border/60 bg-background/80 px-1">1</kbd>–<kbd className="rounded border border-border/60 bg-background/80 px-1">0</kbd> hotbar</span>
          </div>
        </div>
      )}
    </main>
  );
};

export default VoidRunner;
