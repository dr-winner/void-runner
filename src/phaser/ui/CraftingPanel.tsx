import { useState } from "react";
import { useGameStore } from "@/phaser/useGameStore";
import { store } from "@/phaser/gameStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { craft } from "@/phaser/playerState";
import { cn } from "@/lib/utils";
import { sfx } from "@/phaser/audio";

export const CraftingPanel = () => {
  const s = useGameStore();
  const open = s.craftingOpen;
  const p = s.player;
  const [a, setA] = useState<number | null>(null);
  const [b, setB] = useState<number | null>(null);

  const close = () => {
    setA(null); setB(null);
    store.set({ craftingOpen: false, paused: false });
  };
  const select = (i: number) => {
    if (a === null) setA(i);
    else if (b === null && i !== a) setB(i);
    else { setA(i); setB(null); }
  };
  const onCraft = () => {
    if (a === null || b === null) return;
    const r = craft(p, a, b);
    if (r.ok) sfx.levelup();
    store.toast(r.msg, r.ok ? "good" : "bad");
    if (r.ok) store.setPlayer(p);
    setA(null); setB(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-xl bg-background/95 border-[hsl(var(--neon-yellow)/0.5)] font-mono">
        <DialogHeader>
          <DialogTitle className="tracking-[0.3em] text-[hsl(var(--neon-yellow))]">⚒ WORKBENCH</DialogTitle>
        </DialogHeader>
        <div className="text-[10px] text-foreground/60">
          Combine 2 weapons → upgraded weapon · 2 armor → upgraded armor · 2 scrap → Med Pack+
        </div>
        <div className="flex items-center justify-center gap-3 py-2">
          <Slot idx={a} item={a !== null ? p.inventory[a] : null} />
          <span className="text-2xl text-[hsl(var(--neon-yellow))]">+</span>
          <Slot idx={b} item={b !== null ? p.inventory[b] : null} />
          <span className="text-2xl text-foreground/40">=</span>
          <Button onClick={onCraft} disabled={a === null || b === null} className="bg-[hsl(var(--neon-yellow))] text-background hover:bg-[hsl(var(--neon-yellow))/0.85]">
            FORGE
          </Button>
        </div>
        <div className="grid grid-cols-5 gap-2 max-h-[260px] overflow-auto">
          {p.inventory.map((it, i) => (
            <button
              key={i}
              onClick={() => select(i)}
              className={cn(
                "aspect-square rounded-md border text-xs p-2 flex flex-col items-center justify-center gap-1 transition-all",
                (a === i || b === i)
                  ? "border-[hsl(var(--neon-yellow))] bg-[hsl(var(--neon-yellow)/0.15)]"
                  : "border-[hsl(var(--neon-blue)/0.4)] bg-background hover:bg-[hsl(var(--neon-blue)/0.1)]",
              )}
            >
              <span className="text-lg">{glyph(it.type)}</span>
              <span className="truncate text-[9px] w-full text-center">{it.name}</span>
            </button>
          ))}
          {p.inventory.length === 0 && <div className="col-span-5 text-center text-xs text-foreground/40 py-6">No items to craft</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Slot = ({ idx, item }: { idx: number | null; item: any }) => (
  <div className="w-16 h-16 rounded border-2 border-dashed border-[hsl(var(--neon-yellow)/0.6)] bg-background/50 flex flex-col items-center justify-center text-xs">
    {item ? (
      <>
        <span className="text-lg">{glyph(item.type)}</span>
        <span className="truncate text-[8px] w-full text-center px-1">{item.name}</span>
      </>
    ) : <span className="text-foreground/30 text-[10px]">SLOT {idx === null ? "" : ""}</span>}
  </div>
);

function glyph(type: string) {
  switch (type) {
    case "consumable_hp": return "❤";
    case "consumable_en": return "⚡";
    case "weapon": return "✦";
    case "armor": return "◈";
    case "ship_part": return "◊";
    case "scrap": return "▣";
    default: return "?";
  }
}
