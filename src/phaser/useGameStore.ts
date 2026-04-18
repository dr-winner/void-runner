import { useSyncExternalStore } from "react";
import { store, GameSnapshot } from "@/phaser/gameStore";

// useSyncExternalStore gives React tearing-safe subscription and automatically
// bails out of re-renders when the snapshot reference is unchanged.
export function useGameStore(): GameSnapshot {
  return useSyncExternalStore(
    (onChange) => {
      const unsub = store.subscribe(onChange);
      return () => {
        unsub();
      };
    },
    () => store.state,
    () => store.state,
  );
}
