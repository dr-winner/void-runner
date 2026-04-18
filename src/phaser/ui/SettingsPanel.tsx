import { useState } from "react";
import { useGameStore } from "@/phaser/useGameStore";
import { store } from "@/phaser/gameStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { setMasterVolume, setMusicVolume, setMuted, getAudioState, sfx } from "@/phaser/audio";

export const SettingsPanel = ({ onRestart }: { onRestart: () => void }) => {
  const s = useGameStore();
  const open = s.settingsOpen || (s.paused && !s.inventoryOpen && !s.craftingOpen);
  const init = getAudioState();
  const [master, setMaster] = useState(init.masterVol);
  const [music, setMusic] = useState(init.musicVol);
  const [muted, setMutedS] = useState(init.muted);

  if (s.scene !== "playing") return null;

  const close = () => store.set({ settingsOpen: false, paused: false });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-md bg-background/95 border-[hsl(var(--neon-purple)/0.5)] font-mono">
        <DialogHeader>
          <DialogTitle className="tracking-[0.3em] text-[hsl(var(--neon-purple))]">⏸ PAUSED</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-xs">
          <div className="space-y-2">
            <div className="flex justify-between"><span>Master Volume</span><span>{Math.round(master * 100)}%</span></div>
            <Slider value={[master * 100]} onValueChange={([v]) => { const n = v / 100; setMaster(n); setMasterVolume(n); }} max={100} step={1} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between"><span>Ambient Music</span><span>{Math.round(music * 100)}%</span></div>
            <Slider value={[music * 100]} onValueChange={([v]) => { const n = v / 100; setMusic(n); setMusicVolume(n); }} max={100} step={1} />
          </div>
          <div className="flex justify-between items-center">
            <span>Mute All</span>
            <Button size="sm" variant={muted ? "default" : "outline"} onClick={() => { const n = !muted; setMutedS(n); setMuted(n); sfx.uiClick(); }}>
              {muted ? "MUTED" : "ON"}
            </Button>
          </div>

          <div className="pt-3 border-t border-border/30 space-y-2">
            <div className="text-[10px] tracking-widest text-foreground/50">CONTROLS</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-foreground/70">
              <span><kbd>WASD</kbd> Move</span>
              <span><kbd>SPACE</kbd>/LMB Melee</span>
              <span><kbd>F</kbd>/RMB Shoot (5 EN)</span>
              <span><kbd>I</kbd> Inventory</span>
              <span><kbd>E</kbd> Interact / Craft</span>
              <span><kbd>1-9, 0</kbd> Hotbar</span>
              <span><kbd>ESC</kbd> Pause</span>
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-border/30">
            <Button className="flex-1" onClick={close}>Resume</Button>
            <Button variant="destructive" className="flex-1" onClick={onRestart}>New Run</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
