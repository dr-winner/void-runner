"""Player: stats, movement, inventory, leveling."""
import pygame, math
from map import TILE

class Player:
    def __init__(self, x, y):
        self.x = float(x); self.y = float(y)  # world pixel coords
        self.r = 12
        self.hp = 100; self.max_hp = 100
        self.energy = 50; self.max_energy = 50
        self.level = 1; self.xp = 0; self.xp_next = 50
        self.stat_points = 0
        self.speed_stat = 1; self.attack_stat = 1; self.defense_stat = 1
        self.inventory = []  # list of dicts {name, type, value, icon}
        self.ship_parts = 0
        self.attack_cd = 0.0
        self.shoot_cd = 0.0
        self.invuln = 0.0
        self.flash = 0.0
        self.facing = (1, 0)

    @property
    def speed(self):
        return 140 + self.speed_stat * 14
    @property
    def attack_dmg(self):
        return 12 + self.attack_stat * 4
    @property
    def defense(self):
        return self.defense_stat * 2

    def add_xp(self, n):
        self.xp += n
        while self.xp >= self.xp_next:
            self.xp -= self.xp_next
            self.level += 1
            self.stat_points += 2
            self.max_hp += 10; self.hp = self.max_hp
            self.max_energy += 5; self.energy = self.max_energy
            self.xp_next = int(self.xp_next * 1.4)

    def take_damage(self, dmg):
        if self.invuln > 0: return 0
        actual = max(1, dmg - self.defense)
        self.hp -= actual
        self.invuln = 0.6
        self.flash = 0.2
        return actual

    def add_item(self, item):
        if len(self.inventory) >= 20: return False
        self.inventory.append(item)
        if item.get("type") == "ship_part":
            self.ship_parts += 1
        elif item.get("type") == "consumable_hp":
            pass
        return True

    def use_item(self, idx):
        if idx < 0 or idx >= len(self.inventory): return
        it = self.inventory[idx]
        if it["type"] == "consumable_hp":
            self.hp = min(self.max_hp, self.hp + it["value"])
            self.inventory.pop(idx)
        elif it["type"] == "consumable_en":
            self.energy = min(self.max_energy, self.energy + it["value"])
            self.inventory.pop(idx)
        elif it["type"] == "weapon":
            self.attack_stat += it["value"]
            self.inventory.pop(idx)
        elif it["type"] == "armor":
            self.defense_stat += it["value"]
            self.inventory.pop(idx)

    def update(self, dt, keys, gmap):
        dx = (keys[pygame.K_d] or keys[pygame.K_RIGHT]) - (keys[pygame.K_a] or keys[pygame.K_LEFT])
        dy = (keys[pygame.K_s] or keys[pygame.K_DOWN]) - (keys[pygame.K_w] or keys[pygame.K_UP])
        if dx or dy:
            mag = math.hypot(dx, dy)
            dx /= mag; dy /= mag
            self.facing = (dx, dy)
            nx = self.x + dx * self.speed * dt
            ny = self.y + dy * self.speed * dt
            if not self._collides(nx, self.y, gmap): self.x = nx
            if not self._collides(self.x, ny, gmap): self.y = ny

        self.attack_cd = max(0, self.attack_cd - dt)
        self.shoot_cd = max(0, self.shoot_cd - dt)
        self.invuln = max(0, self.invuln - dt)
        self.flash = max(0, self.flash - dt)
        # Energy regen
        self.energy = min(self.max_energy, self.energy + 4 * dt)
        # Reveal fog
        gmap.reveal(int(self.x // TILE), int(self.y // TILE), 6)

    def _collides(self, x, y, gmap):
        for ox, oy in [(-self.r, -self.r), (self.r, -self.r), (-self.r, self.r), (self.r, self.r)]:
            if gmap.is_solid(int((x+ox)//TILE), int((y+oy)//TILE)):
                return True
        return False

    def melee(self):
        if self.attack_cd > 0: return None
        self.attack_cd = 0.35
        fx, fy = self.facing
        return (self.x + fx*30, self.y + fy*30, self.attack_dmg, 28)  # x,y,dmg,radius

    def shoot(self):
        if self.shoot_cd > 0 or self.energy < 5: return None
        self.shoot_cd = 0.25
        self.energy -= 5
        return (self.x, self.y, self.facing[0], self.facing[1], self.attack_dmg + 4)

    def draw(self, surf, cam_x, cam_y):
        cx, cy = int(self.x - cam_x), int(self.y - cam_y)
        color = (255, 120, 120) if self.flash > 0 else (120, 220, 255)
        pygame.draw.circle(surf, (10, 20, 40), (cx, cy+2), self.r+1)
        pygame.draw.circle(surf, color, (cx, cy), self.r)
        pygame.draw.circle(surf, (255, 255, 255), (cx, cy), self.r, 2)
        # facing indicator
        fx, fy = self.facing
        pygame.draw.line(surf, (255,255,255), (cx, cy), (cx+int(fx*16), cy+int(fy*16)), 2)
        # HP bar
        bw = 32
        pygame.draw.rect(surf, (40,0,0), (cx-bw//2, cy-self.r-10, bw, 4))
        pygame.draw.rect(surf, (80,255,120), (cx-bw//2, cy-self.r-10, int(bw*self.hp/self.max_hp), 4))
