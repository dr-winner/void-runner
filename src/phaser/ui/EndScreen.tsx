import { Button } from "@/components/ui/button";
import { useGameStore } from "@/phaser/useGameStore";
import { store } from "@/phaser/gameStore";
import { sfx } from "@/phaser/audio";
import { Skull, Trophy, RotateCcw } from "lucide-react";

export const EndScreen = ({ onRestart }: { onRestart: () => void }) => {
  const s = useGameStore();
  if (s.scene !== "gameover" && s.scene !== "victory") return null;
  const won = s.scene === "victory";
  const mm = Math.floor(s.runTime / 60).toString().padStart(2, "0");
  const ss = (s.runTime % 60).toString().padStart(2, "0");

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-background/85 backdrop-blur-md font-mono animate-fade-in">
      <div className={`max-w-md w-[90%] rounded-xl border p-8 text-center space-y-5 ${won ? "border-[hsl(var(--neon-green))] shadow-[0_0_60px_hsl(var(--neon-green)/0.4)]" : "border-[hsl(var(--hp))] shadow-[0_0_60px_hsl(var(--hp)/0.4)]"}`}>
        {won ? (
          <Trophy className="w-16 h-16 mx-auto text-[hsl(var(--neon-green))]" />
        ) : (
          <Skull className="w-16 h-16 mx-auto text-[hsl(var(--hp))]" />
        )}
        <h2 className={`text-3xl tracking-[0.3em] ${won ? "text-[hsl(var(--neon-green))]" : "text-[hsl(var(--hp))]"}`}>
          {won ? "ESCAPED" : "MISSION FAILED"}
        </h2>
        <p className="text-xs text-foreground/60">
          {won ? "You repaired the ship and broke orbit. The void is yours." : "Your signature went cold on the surface. The Guardian endures."}
        </p>
        <div className="grid grid-cols-2 gap-3 text-left text-xs pt-2">
          <Stat label="LEVEL" value={s.player.level} />
          <Stat label="KILLS" value={s.kills} />
          <Stat label="PARTS" value={`${s.shipParts}/5`} />
          <Stat label="TIME" value={`${mm}:${ss}`} />
        </div>
        <Button className="w-full mt-2" onClick={() => { sfx.uiClick(); onRestart(); }}>
          <RotateCcw className="w-4 h-4 mr-2" />NEW RUN
        </Button>
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: any }) => (
  <div className="rounded border border-border/40 bg-background/40 px-3 py-2">
    <div className="text-[9px] tracking-[0.3em] text-foreground/50">{label}</div>
    <div className="text-foreground font-bold text-base">{value}</div>
  </div>
);
