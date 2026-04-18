import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { createGame } from "@/phaser/createGame";
import { store } from "@/phaser/gameStore";
import { useGameStore } from "@/phaser/useGameStore";
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
  const s = useGameStore();
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
    store.set({ scene: "menu", paused: false, inventoryOpen: false, craftingOpen: false, settingsOpen: false });
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
      if (s.scene === "playing") store.save();
    }, 5000);
    const beforeUnload = () => store.save();
    window.addEventListener("beforeunload", beforeUnload);
    return () => { clearInterval(id); window.removeEventListener("beforeunload", beforeUnload); };
  }, [s.scene]);

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center gap-3 px-2 py-4 bg-[radial-gradient(ellipse_at_center,_hsl(var(--neon-purple)/0.08),_transparent_70%)]">
      <div
        className="relative rounded-xl overflow-hidden border border-[hsl(var(--neon-blue)/0.45)] shadow-[0_0_80px_hsl(var(--neon-purple)/0.3),0_0_30px_hsl(var(--neon-blue)/0.2)_inset] bg-background"
        style={{ width: "min(100%, 1280px)", aspectRatio: "16 / 9" }}
      >
        <div ref={mountRef} className="w-full h-full" />
        {!showMenu && <HUD />}
        <InventoryPanel />
        <CraftingPanel />
        <SettingsPanel onRestart={restart} />
        <EndScreen onRestart={restart} />
        {showMenu && <MainMenu hasSave={hasSave} onContinue={() => startGame(true)} onNew={() => startGame(false)} />}
      </div>
      <p className="text-[10px] text-foreground/40 font-mono tracking-widest">
        WASD MOVE · LMB/SPACE MELEE · RMB/F SHOOT · I INVENTORY · E INTERACT · ESC PAUSE · 1-0 HOTBAR
      </p>
    </main>
  );
};

export default VoidRunner;
