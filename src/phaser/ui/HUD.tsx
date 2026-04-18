import { memo } from "react";
import { Heart, Zap, Star, Skull, Clock, Package, MapPin } from "lucide-react";
import { useGameStore } from "@/phaser/useGameStore";
import { cn } from "@/lib/utils";

export const HUD = memo(function HUD() {
  const s = useGameStore();
  const p = s.player;
  if (s.scene !== "playing") return null;
  const hpPct = (p.hp / p.maxHp) * 100;
  const enPct = (p.energy / p.maxEnergy) * 100;
  const xpPct = (p.xp / p.xpNext) * 100;
  const mm = Math.floor(s.runTime / 60).toString().padStart(2, "0");
  const ss = (s.runTime % 60).toString().padStart(2, "0");

  return (
    <div className="pointer-events-none absolute inset-0 z-20 font-mono text-foreground">
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 85% 70% at 50% 45%, transparent 0%, hsl(var(--background) / 0.15) 100%)",
        }}
      />
      {/* Top-left status panel */}
      <div className="absolute top-3 left-3 w-[min(92vw,320px)] space-y-2 rounded-xl border border-[hsl(var(--neon-blue)/0.35)] bg-background/75 backdrop-blur-md p-3 shadow-[0_4px_24px_hsl(var(--background)/0.5),0_0_40px_hsl(var(--neon-purple)/0.12)]">
        <div className="flex items-center justify-between gap-2 text-[10px] tracking-[0.2em] text-[hsl(var(--neon-blue))]">
          <span className="flex items-center gap-1.5 min-w-0"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{s.biomeName}</span></span>
          <span className="text-foreground/45 shrink-0 tabular-nums">SEED {s.seed.toString(16).slice(0, 6).toUpperCase()}</span>
        </div>
        <Bar icon={<Heart className="w-3.5 h-3.5" />} label={`HP ${Math.ceil(p.hp)}/${p.maxHp}`} pct={hpPct} colorVar="--hp" />
        <Bar icon={<Zap className="w-3.5 h-3.5" />} label={`EN ${Math.ceil(p.energy)}/${p.maxEnergy}`} pct={enPct} colorVar="--energy" />
        <Bar icon={<Star className="w-3.5 h-3.5" />} label={`LVL ${p.level} · ${p.xp}/${p.xpNext} XP`} pct={xpPct} colorVar="--neon-purple" />
        <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
          <Stat label="ATK" value={p.attack} />
          <Stat label="DEF" value={p.defense} />
          <Stat label="SPD" value={p.speed} />
        </div>
        {p.statPoints > 0 && (
          <div className="text-[10px] text-[hsl(var(--neon-yellow))] animate-pulse">
            {p.statPoints} stat point{p.statPoints > 1 ? "s" : ""} — press [C]
          </div>
        )}
      </div>

      {/* Top-center counters */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-2 max-w-[95vw]">
        <Chip icon={<Package className="w-3 h-3" />} label={`STAGE ${s.stage}/${s.maxStage}`} active={s.stage > 1} />
        <Chip icon={<Skull className="w-3 h-3" />} label={`${s.kills} KILLS`} />
        <Chip icon={<Clock className="w-3 h-3" />} label={`${mm}:${ss}`} />
      </div>

      {/* Boss bar */}
      {s.bossActive && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[480px] max-w-[80vw] space-y-1 animate-fade-in">
          <div className="flex justify-between text-[10px] tracking-[0.4em] text-[hsl(var(--hp))]">
            <span>⚠ {s.bossActive.name}</span>
            <span>{Math.max(0, Math.ceil(s.bossActive.hp))}/{s.bossActive.maxHp}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-background/70 border border-[hsl(var(--hp)/0.5)] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[hsl(var(--hp))] to-[hsl(var(--neon-yellow))] transition-all"
              style={{ width: `${Math.max(0, (s.bossActive.hp / s.bossActive.maxHp) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Hotbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 sm:gap-1.5 pointer-events-auto px-1">
        {p.hotbar.map((slot, i) => {
          const it = slot !== null ? p.inventory[slot] : null;
          return (
            <div key={i} className={cn(
              "relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg border bg-background/80 backdrop-blur flex items-center justify-center text-[10px] transition-shadow duration-150",
              it ? "border-[hsl(var(--neon-blue)/0.55)] shadow-[0_0_12px_hsl(var(--neon-blue)/0.22)]" : "border-border/45 opacity-90",
            )}>
              <span className="absolute top-0.5 left-1 text-[8px] text-foreground/45 tabular-nums">{i === 9 ? 0 : i + 1}</span>
              {it && <ItemGlyph type={it.type} />}
            </div>
          );
        })}
      </div>

      {/* Toast */}
      {s.toast && (
        <div key={s.toast.id} className={cn(
          "absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-md border bg-background/85 backdrop-blur text-xs animate-fade-in",
          s.toast.kind === "good" && "border-[hsl(var(--neon-green))] text-[hsl(var(--neon-green))] shadow-[0_0_20px_hsl(var(--neon-green)/0.4)]",
          s.toast.kind === "bad" && "border-[hsl(var(--hp))] text-[hsl(var(--hp))]",
          s.toast.kind === "info" && "border-[hsl(var(--neon-blue))] text-[hsl(var(--neon-blue))]",
        )}>
          {s.toast.text}
        </div>
      )}
    </div>
  );
});

const Bar = ({ icon, label, pct, colorVar }: { icon: React.ReactNode; label: string; pct: number; colorVar: string }) => (
  <div className="space-y-0.5">
    <div className="flex items-center justify-between text-[10px] text-foreground/70">
      <span className="flex items-center gap-1.5">{icon}{label}</span>
    </div>
    <div className="h-2 w-full rounded-full bg-background/70 border border-border/50 overflow-hidden">
      <div className="h-full transition-all" style={{ width: `${pct}%`, background: `hsl(var(${colorVar}))`, boxShadow: `0 0 10px hsl(var(${colorVar}) / 0.5)` }} />
    </div>
  </div>
);

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded border border-border/40 bg-background/40 px-2 py-1 text-center">
    <div className="text-[8px] text-foreground/50 tracking-widest">{label}</div>
    <div className="text-foreground font-bold">{value}</div>
  </div>
);

const Chip = ({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) => (
  <div className={cn(
    "flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] tracking-widest border bg-background/70 backdrop-blur",
    active ? "border-[hsl(var(--neon-green))] text-[hsl(var(--neon-green))] shadow-[0_0_15px_hsl(var(--neon-green)/0.3)]" : "border-border/50 text-foreground/70",
  )}>
    {icon}{label}
  </div>
);

const ItemGlyph = ({ type }: { type: string }) => {
  const map: Record<string, { c: string; t: string }> = {
    consumable_hp: { c: "hsl(var(--hp))", t: "❤" },
    consumable_en: { c: "hsl(var(--energy))", t: "⚡" },
    weapon: { c: "hsl(var(--neon-yellow))", t: "✦" },
    armor: { c: "hsl(var(--neon-purple))", t: "◈" },
    ship_part: { c: "hsl(var(--neon-green))", t: "◊" },
    scrap: { c: "hsl(var(--muted-foreground))", t: "▣" },
  };
  const m = map[type] ?? { c: "white", t: "?" };
  return <span style={{ color: m.c }} className="text-base">{m.t}</span>;
};
