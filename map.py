"""Procedural map: 3 biomes, fog of war, tile collision, ship parts placement."""
import random

TILE = 32
MAP_W, MAP_H = 80, 60

# Tile types
T_FLOOR, T_WALL, T_WATER, T_GRASS, T_TREE, T_ROCK, T_RUIN, T_VOID, T_PAD = range(9)

BIOME_CRASH, BIOME_JUNGLE, BIOME_RUINS = 0, 1, 2

BIOME_NAMES = {0: "CRASHED ZONE", 1: "ALIEN JUNGLE", 2: "UNDERGROUND RUINS"}

# (floor_color, wall_color, accent_color)
BIOME_COLORS = {
    BIOME_CRASH:  ((28, 30, 40), (70, 50, 45), (180, 120, 60)),
    BIOME_JUNGLE: ((10, 28, 22), (20, 60, 40), (80, 200, 130)),
    BIOME_RUINS:  ((14, 12, 22), (50, 40, 80), (160, 100, 220)),
}

SOLID = {T_WALL, T_TREE, T_ROCK, T_RUIN, T_VOID}


class GameMap:
    def __init__(self, seed=None):
        self.seed = seed if seed is not None else random.randint(0, 999999)
        self.rng = random.Random(self.seed)
        self.w, self.h = MAP_W, MAP_H
        self.tiles = [[T_FLOOR]*self.h for _ in range(self.w)]
        self.biome = [[BIOME_CRASH]*self.h for _ in range(self.w)]
        self.fog = [[True]*self.h for _ in range(self.w)]  # True = hidden
        self.ship_parts = []   # list of (x,y) world tile coords
        self.workbenches = []
        self.escape_pod = (self.w//2, self.h//2)
        self.spawn = (self.w//2, self.h//2)
        self._generate()

    # ----- generation -----
    def _generate(self):
        rng = self.rng
        # Assign biomes by 3 vertical bands (with jitter)
        b1 = self.w // 3
        b2 = 2 * self.w // 3
        for x in range(self.w):
            for y in range(self.h):
                jitter = rng.randint(-3, 3)
                if x + jitter < b1:
                    self.biome[x][y] = BIOME_CRASH
                elif x + jitter < b2:
                    self.biome[x][y] = BIOME_JUNGLE
                else:
                    self.biome[x][y] = BIOME_RUINS

        # Fill terrain per biome
        for x in range(self.w):
            for y in range(self.h):
                b = self.biome[x][y]
                r = rng.random()
                if x == 0 or y == 0 or x == self.w-1 or y == self.h-1:
                    self.tiles[x][y] = T_VOID
                    continue
                if b == BIOME_CRASH:
                    self.tiles[x][y] = T_ROCK if r < 0.10 else T_FLOOR
                elif b == BIOME_JUNGLE:
                    if r < 0.18: self.tiles[x][y] = T_TREE
                    elif r < 0.22: self.tiles[x][y] = T_WATER
                    else: self.tiles[x][y] = T_GRASS
                else:
                    if r < 0.22: self.tiles[x][y] = T_RUIN
                    else: self.tiles[x][y] = T_FLOOR

        # Carve starting clearing
        sx, sy = self.w // 6, self.h // 2
        self.spawn = (sx, sy)
        for x in range(sx-3, sx+4):
            for y in range(sy-3, sy+4):
                self.tiles[x][y] = T_FLOOR

        # Escape pod in ruins area
        ex, ey = self.w - 6, self.h // 2
        for x in range(ex-2, ex+3):
            for y in range(ey-2, ey+3):
                self.tiles[x][y] = T_FLOOR
        self.tiles[ex][ey] = T_PAD
        self.escape_pod = (ex, ey)

        # 5 ship parts scattered, one per region roughly
        zones = [
            (4, 20, 4, self.h-4),
            (b1+2, b2-2, 4, self.h-4),
            (b2+2, self.w-4, 4, self.h-4),
            (b1, b2, 4, self.h//2),
            (b2-4, self.w-6, self.h//2, self.h-4),
        ]
        for (x0, x1, y0, y1) in zones:
            for _ in range(80):
                x = rng.randint(x0, x1); y = rng.randint(y0, y1)
                if self.tiles[x][y] not in SOLID and (x,y) != self.spawn and (x,y) != self.escape_pod:
                    self.ship_parts.append((x, y))
                    break

        # 2 workbenches
        for _ in range(2):
            for _ in range(200):
                x = rng.randint(2, self.w-3); y = rng.randint(2, self.h-3)
                if self.tiles[x][y] not in SOLID:
                    self.workbenches.append((x, y))
                    break

    # ----- queries -----
    def is_solid(self, tx, ty):
        if not (0 <= tx < self.w and 0 <= ty < self.h):
            return True
        return self.tiles[tx][ty] in SOLID

    def reveal(self, tx, ty, radius=5):
        for x in range(max(0, tx-radius), min(self.w, tx+radius+1)):
            for y in range(max(0, ty-radius), min(self.h, ty+radius+1)):
                if (x-tx)**2 + (y-ty)**2 <= radius*radius:
                    self.fog[x][y] = False

    def biome_at(self, tx, ty):
        if 0 <= tx < self.w and 0 <= ty < self.h:
            return self.biome[tx][ty]
        return BIOME_CRASH

    def draw(self, surf, cam_x, cam_y, screen_w, screen_h):
        import pygame
        x0 = max(0, cam_x // TILE)
        y0 = max(0, cam_y // TILE)
        x1 = min(self.w, (cam_x + screen_w) // TILE + 2)
        y1 = min(self.h, (cam_y + screen_h) // TILE + 2)
        for x in range(x0, x1):
            for y in range(y0, y1):
                if self.fog[x][y]:
                    continue
                t = self.tiles[x][y]
                b = self.biome[x][y]
                floor, wall, accent = BIOME_COLORS[b]
                rect = pygame.Rect(x*TILE - cam_x, y*TILE - cam_y, TILE, TILE)
                if t in (T_FLOOR, T_GRASS):
                    pygame.draw.rect(surf, floor if t == T_FLOOR else (floor[0]+6, floor[1]+18, floor[2]+10), rect)
                elif t == T_WALL or t == T_RUIN:
                    pygame.draw.rect(surf, wall, rect)
                    pygame.draw.rect(surf, accent, rect, 1)
                elif t == T_TREE:
                    pygame.draw.rect(surf, floor, rect)
                    pygame.draw.circle(surf, accent, rect.center, TILE//2 - 4)
                elif t == T_ROCK:
                    pygame.draw.rect(surf, floor, rect)
                    pygame.draw.polygon(surf, wall,
                        [(rect.x+6,rect.bottom-4),(rect.centerx,rect.y+6),(rect.right-4,rect.bottom-4)])
                elif t == T_WATER:
                    pygame.draw.rect(surf, (20, 40, 80), rect)
                elif t == T_VOID:
                    pygame.draw.rect(surf, (0, 0, 0), rect)
                elif t == T_PAD:
                    pygame.draw.rect(surf, (40, 40, 60), rect)
                    pygame.draw.circle(surf, (120, 220, 255), rect.center, TILE//2-2, 2)

        # Draw ship parts (revealed only)
        for (x, y) in self.ship_parts:
            if self.fog[x][y]: continue
            cx = x*TILE - cam_x + TILE//2
            cy = y*TILE - cam_y + TILE//2
            pygame.draw.circle(surf, (255, 230, 90), (cx, cy), 8)
            pygame.draw.circle(surf, (160, 120, 20), (cx, cy), 8, 2)

        # Workbenches
        for (x, y) in self.workbenches:
            if self.fog[x][y]: continue
            rect = pygame.Rect(x*TILE - cam_x + 4, y*TILE - cam_y + 8, TILE-8, TILE-16)
            pygame.draw.rect(surf, (180, 140, 60), rect)
            pygame.draw.rect(surf, (60, 40, 10), rect, 2)
