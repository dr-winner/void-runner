import { describe, it, expect } from "vitest";
import { createPlayerState, useItem, craft } from "@/phaser/playerState";
import { stageModifiersForStage, isBossStage, enemyScaleForStage } from "@/phaser/constants";

describe("stage modifiers", () => {
  it("uses neutral modifier on boss stages", () => {
    const stage = 10;
    expect(isBossStage(stage)).toBe(true);
    const mod = stageModifiersForStage(stage);
    expect(mod.id).toBe("none");
    expect(mod.enemyCountBonus).toBe(0);
  });

  it("returns non-neutral modifiers on non-boss stages", () => {
    const mod = stageModifiersForStage(7);
    expect(mod.id).not.toBe("none");
    expect(mod.label.length).toBeGreaterThan(0);
  });
});

describe("enemy scaling", () => {
  it("increases hp and damage over stage progression", () => {
    const early = enemyScaleForStage(1);
    const late = enemyScaleForStage(30);
    expect(late.hp).toBeGreaterThan(early.hp);
    expect(late.damage).toBeGreaterThan(early.damage);
  });
});

describe("weapon archetypes", () => {
  it("equips weapon archetype when consuming a weapon item", () => {
    const p = createPlayerState();
    p.inventory.push({
      id: "w1",
      name: "Scatter Array Mk2",
      type: "weapon",
      value: 5,
      tier: 2,
      weaponArchetype: "scatter",
    });
    const r = useItem(p, 0);
    expect(r.used).toBe(true);
    expect(p.weaponArchetype).toBe("scatter");
    expect(p.weaponTier).toBe(2);
  });

  it("merges crafted weapons into a deterministic archetype", () => {
    const p = createPlayerState();
    p.inventory.push(
      { id: "w1", name: "Pulse", type: "weapon", value: 3, tier: 1, weaponArchetype: "pulse" },
      { id: "w2", name: "Scatter", type: "weapon", value: 3, tier: 1, weaponArchetype: "scatter" },
    );
    const out = craft(p, 0, 1);
    expect(out.ok).toBe(true);
    expect(out.result?.type).toBe("weapon");
    expect(out.result?.weaponArchetype).toBe("scatter");
  });
});
