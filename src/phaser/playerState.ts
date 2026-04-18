import { Item } from "./constants";

export interface PlayerStats {
  level: number;
  xp: number;
  xpNext: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  attack: number;
  defense: number;
  speed: number;
  statPoints: number;
}

export interface PlayerState extends PlayerStats {
  inventory: Item[];
  shipParts: number;
  hotbar: (number | null)[]; // indexes into inventory; length 10
}

export const INVENTORY_MAX = 20;

export function createPlayerState(): PlayerState {
  return {
    level: 1,
    xp: 0,
    xpNext: 50,
    hp: 100,
    maxHp: 100,
    energy: 50,
    maxEnergy: 50,
    attack: 10,
    defense: 2,
    speed: 200,
    statPoints: 0,
    inventory: [],
    shipParts: 0,
    hotbar: Array(10).fill(null),
  };
}

export function gainXp(p: PlayerState, amount: number): boolean {
  p.xp += amount;
  let leveled = false;
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext;
    p.level += 1;
    p.statPoints += 2;
    p.xpNext = Math.floor(p.xpNext * 1.45);
    p.maxHp += 10;
    p.maxEnergy += 5;
    p.hp = p.maxHp;
    p.energy = p.maxEnergy;
    leveled = true;
  }
  return leveled;
}

export function addItem(p: PlayerState, item: Item): boolean {
  if (p.inventory.length >= INVENTORY_MAX) return false;
  p.inventory.push(item);
  // auto assign to first empty hotbar slot if consumable
  if (item.type === "consumable_hp" || item.type === "consumable_en") {
    const idx = p.inventory.length - 1;
    const slot = p.hotbar.findIndex((s) => s === null);
    if (slot >= 0) p.hotbar[slot] = idx;
  }
  return true;
}

export function useItem(p: PlayerState, idx: number): { used: boolean; msg?: string } {
  const it = p.inventory[idx];
  if (!it) return { used: false };
  if (it.type === "consumable_hp") {
    p.hp = Math.min(p.maxHp, p.hp + it.value);
    p.inventory.splice(idx, 1);
    cleanupHotbar(p, idx);
    return { used: true, msg: `+${it.value} HP` };
  }
  if (it.type === "consumable_en") {
    p.energy = Math.min(p.maxEnergy, p.energy + it.value);
    p.inventory.splice(idx, 1);
    cleanupHotbar(p, idx);
    return { used: true, msg: `+${it.value} EN` };
  }
  if (it.type === "weapon") {
    p.attack += it.value;
    p.inventory.splice(idx, 1);
    cleanupHotbar(p, idx);
    return { used: true, msg: `+${it.value} ATK` };
  }
  if (it.type === "armor") {
    p.defense += it.value;
    p.inventory.splice(idx, 1);
    cleanupHotbar(p, idx);
    return { used: true, msg: `+${it.value} DEF` };
  }
  return { used: false };
}

function cleanupHotbar(p: PlayerState, removedIdx: number) {
  for (let i = 0; i < p.hotbar.length; i++) {
    const s = p.hotbar[i];
    if (s === removedIdx) p.hotbar[i] = null;
    else if (s !== null && s > removedIdx) p.hotbar[i] = s - 1;
  }
}

export function spendStat(p: PlayerState, stat: "attack" | "defense" | "speed"): boolean {
  if (p.statPoints <= 0) return false;
  p.statPoints -= 1;
  if (stat === "attack") p.attack += 2;
  if (stat === "defense") p.defense += 1;
  if (stat === "speed") p.speed += 12;
  return true;
}

// Crafting: combine 2 items at workbench
export function craft(p: PlayerState, idxA: number, idxB: number): { ok: boolean; result?: Item; msg: string } {
  const a = p.inventory[idxA];
  const b = p.inventory[idxB];
  if (!a || !b || idxA === idxB) return { ok: false, msg: "Pick two items" };
  if (a.type === "weapon" && b.type === "weapon") {
    const result: Item = { id: "wpn", name: `Pulse Blade Mk${(a.tier ?? 1) + (b.tier ?? 1)}`, type: "weapon", value: a.value + b.value + 1, tier: (a.tier ?? 1) + (b.tier ?? 1) };
    removeTwo(p, idxA, idxB);
    p.inventory.push(result);
    return { ok: true, result, msg: "Forged upgraded weapon" };
  }
  if (a.type === "armor" && b.type === "armor") {
    const result: Item = { id: "arm", name: `Nano Plate Mk${(a.tier ?? 1) + (b.tier ?? 1)}`, type: "armor", value: a.value + b.value + 1, tier: (a.tier ?? 1) + (b.tier ?? 1) };
    removeTwo(p, idxA, idxB);
    p.inventory.push(result);
    return { ok: true, result, msg: "Forged upgraded armor" };
  }
  if (a.type === "scrap" && b.type === "scrap") {
    const result: Item = { id: "med", name: "Med Pack+", type: "consumable_hp", value: 45 };
    removeTwo(p, idxA, idxB);
    p.inventory.push(result);
    return { ok: true, result, msg: "Built a Med Pack+" };
  }
  return { ok: false, msg: "Incompatible items" };
}

function removeTwo(p: PlayerState, a: number, b: number) {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  p.inventory.splice(hi, 1);
  p.inventory.splice(lo, 1);
  // hotbar reindex
  p.hotbar = p.hotbar.map((s) => {
    if (s === null) return null;
    if (s === hi || s === lo) return null;
    let n = s;
    if (s > hi) n -= 1;
    if (s > lo) n -= 1;
    return n;
  });
}
