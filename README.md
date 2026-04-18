# VOID RUNNER

A top-down sci-fi RPG built with Python + Pygame. You're a stranded mercenary —
explore procedural biomes, fight aliens, collect 5 ship parts, and escape.

## Setup
```bash
pip install pygame
python main.py
```

## Controls
- **WASD / Arrows** – Move
- **Space** – Melee attack
- **Right Click / F** – Energy shot (costs 5 energy)
- **I** – Inventory
- **C** – Spend stat points (when leveled up)
- **E** – Interact (workbench, escape pod, pickups)
- **Esc** – Save & quit

## Files
- `main.py` – entrypoint
- `game.py` – main loop, save/load, scenes
- `player.py` – player, stats, inventory
- `enemy.py` – Crawler, Spitter, Guardian + AI
- `map.py` – procedural biomes, fog of war, tiles
- `ui.py` – HUD, minimap, menus
