import { useEffect, useState } from "react";
import { store, GameSnapshot } from "@/phaser/gameStore";

export function useGameStore(): GameSnapshot {
  const [s, set] = useState(store.state);
  useEffect(() => {
    const unsub = store.subscribe(() => set({ ...store.state }));
    return () => unsub();
  }, []);
  return s;
}
