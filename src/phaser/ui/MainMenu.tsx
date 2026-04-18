import { Button } from "@/components/ui/button";
import { sfx, unlockAudio } from "@/phaser/audio";
import { Rocket, Play, RotateCcw, Github } from "lucide-react";
import { useEffect, useRef } from "react";

interface Props {
  hasSave: boolean;
  onContinue: () => void;
  onNew: () => void;
}

export const MainMenu = ({ hasSave, onContinue, onNew }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated starfield background
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    let raf = 0;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      c.width = c.clientWidth * dpr;
      c.height = c.clientHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);
    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      z: Math.random() * 1 + 0.2,
      r: Math.random() * 1.6 + 0.3,
      h: Math.random() < 0.15 ? 195 : Math.random() < 0.3 ? 280 : 200,
    }));
    const loop = () => {
      ctx.fillStyle = "rgba(5,7,13,0.35)";
      ctx.fillRect(0, 0, c.width, c.height);
      for (const s of stars) {
        s.x -= s.z * 0.6;
        if (s.x < 0) { s.x = c.width; s.y = Math.random() * c.height; }
        ctx.fillStyle = `hsla(${s.h}, 90%, 70%, ${0.3 + s.z * 0.5})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="absolute inset-0 z-30 grid place-items-center font-mono">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background/90" />
      <div className="relative space-y-6 text-center px-6">
        <Rocket className="w-12 h-12 mx-auto text-[hsl(var(--neon-blue))] drop-shadow-[0_0_20px_hsl(var(--neon-blue))] animate-pulse" />
        <h1 className="text-5xl md:text-7xl font-bold tracking-[0.35em] text-[hsl(var(--neon-blue))] drop-shadow-[0_0_24px_hsl(var(--neon-blue)/0.7)]">
          VOID<span className="text-[hsl(var(--neon-purple))]"> RUNNER</span>
        </h1>
        <p className="text-xs md:text-sm text-foreground/70 max-w-md mx-auto tracking-wider">
          Stranded on a hostile world. Collect five ship parts.<br/>Survive three biomes. Escape the Guardian.
        </p>
        <div className="flex flex-col gap-2 max-w-xs mx-auto pt-4">
          {hasSave && (
            <Button size="lg" onClick={() => { sfx.uiClick(); unlockAudio(); onContinue(); }}
              className="bg-[hsl(var(--neon-blue))] text-background hover:bg-[hsl(var(--neon-blue))/0.8] tracking-[0.3em] shadow-[0_0_30px_hsl(var(--neon-blue)/0.4)]">
              <Play className="w-4 h-4 mr-2" />CONTINUE
            </Button>
          )}
          <Button size="lg" variant={hasSave ? "outline" : "default"} onClick={() => { sfx.uiClick(); unlockAudio(); onNew(); }}
            className={hasSave ? "tracking-[0.3em] border-[hsl(var(--neon-purple)/0.5)]" : "bg-[hsl(var(--neon-purple))] text-background hover:bg-[hsl(var(--neon-purple))/0.85] tracking-[0.3em] shadow-[0_0_30px_hsl(var(--neon-purple)/0.4)]"}>
            <RotateCcw className="w-4 h-4 mr-2" />{hasSave ? "NEW RUN" : "BEGIN"}
          </Button>
        </div>
        <div className="text-[10px] text-foreground/40 pt-6 tracking-widest">PHASER 3 · WEBGL · 60FPS</div>
      </div>
    </div>
  );
};
