import { useGameStore } from "@/phaser/useGameStore";
import { store } from "@/phaser/gameStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useItem, spendStat } from "@/phaser/playerState";
import { sfx } from "@/phaser/audio";
import { cn } from "@/lib/utils";

export const InventoryPanel = () => {
  const s = useGameStore();
  const open = s.inventoryOpen;
  const p = s.player;
  const close = () => store.set({ inventoryOpen: false, paused: false });

  const onUse = (i: number) => {
    const r = useItem(p, i);
    if (r.used) {
      sfx.pickup();
      if (r.msg) store.toast(r.msg, "good");
      store.setPlayer(p);
    }
  };
  const onSpend = (stat: "attack" | "defense" | "speed") => {
    if (spendStat(p, stat)) {
      sfx.levelup();
      store.setPlayer(p);
      store.toast(`+${stat.toUpperCase()}`, "good");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-2xl bg-background/95 border-[hsl(var(--neon-blue)/0.4)] font-mono">
        <DialogHeader>
          <DialogTitle className="tracking-[0.3em] text-[hsl(var(--neon-blue))]">INVENTORY</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 20 }).map((_, i) => {
            const it = p.inventory[i];
            return (
              <button
                key={i}
                disabled={!it}
                onClick={() => onUse(i)}
                className={cn(
                  "aspect-square rounded-md border text-xs p-2 flex flex-col items-center justify-center gap-1 transition-all",
                  it ? "border-[hsl(var(--neon-blue)/0.5)] bg-background hover:bg-[hsl(var(--neon-blue)/0.1)] hover:scale-105" : "border-border/30 bg-background/40",
                )}
              >
                {it ? (
                  <>
                    <span className="text-lg">{glyph(it.type)}</span>
                    <span className="truncate text-[9px] w-full text-center text-foreground/80">{it.name}</span>
                    <span className="text-[8px] text-[hsl(var(--neon-yellow))]">+{it.value}</span>
                  </>
                ) : <span className="text-foreground/20">·</span>}
              </button>
            );
          })}
        </div>

        {p.statPoints > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/30">
            <div className="text-xs tracking-widest text-[hsl(var(--neon-yellow))]">SPEND STAT POINTS · {p.statPoints} available</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onSpend("attack")}>+2 ATK</Button>
              <Button size="sm" variant="outline" onClick={() => onSpend("defense")}>+1 DEF</Button>
              <Button size="sm" variant="outline" onClick={() => onSpend("speed")}>+12 SPD</Button>
            </div>
          </div>
        )}

        <div className="text-[10px] text-foreground/50">Click an item to use/equip · Stats apply instantly</div>
      </DialogContent>
    </Dialog>
  );
};

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
