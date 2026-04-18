"""Enemies: Crawler (melee), Spitter (ranged), Guardian (boss). Patrol/chase AI."""
import pygame, math, random
from map import TILE

class Projectile:
    def __init__(self, x, y, vx, vy, dmg, hostile=True):
        self.x=x; self.y=y; self.vx=vx; self.vy=vy; self.dmg=dmg; self.alive=True; self.hostile=hostile
        self.life=2.0
    def update(self, dt, gmap):
        self.x += self.vx*dt; self.y += self.vy*dt
        self.life -= dt
        if self.life <= 0: self.alive = False
        if gmap.is_solid(int(self.x//TILE), int(self.y//TILE)): self.alive = False
    def draw(self, surf, cx, cy):
        col = (255, 120, 80) if self.hostile else (120, 220, 255)
        pygame.draw.circle(surf, col, (int(self.x-cx), int(self.y-cy)), 4)


class Enemy:
    def __init__(self, x, y, kind="crawler"):
        self.x=float(x); self.y=float(y); self.kind=kind
        self.r=12
        self.flash=0.0
        self.cd=0.0
        self.alive=True
        self.state="patrol"
        self.target=(x,y)
        self.patrol_t=0.0
        if kind=="crawler":
            self.hp=30; self.max_hp=30; self.speed=80; self.dmg=8; self.xp=15; self.color=(220,80,80)
        elif kind=="spitter":
            self.hp=24; self.max_hp=24; self.speed=55; self.dmg=10; self.xp=22; self.color=(180,200,80)
        else: # guardian
            self.hp=240; self.max_hp=240; self.speed=70; self.dmg=18; self.xp=120; self.color=(200,80,220)
            self.r=20

    def damage(self, dmg):
        self.hp -= dmg; self.flash=0.18
        if self.hp <= 0: self.alive=False

    def update(self, dt, player, gmap, projectiles):
        self.flash=max(0,self.flash-dt)
        self.cd=max(0,self.cd-dt)
        dx = player.x - self.x; dy = player.y - self.y
        dist = math.hypot(dx,dy)
        sight = 220 if self.kind!="guardian" else 380
        if dist < sight:
            self.state="chase"
        elif dist > sight*1.6:
            self.state="patrol"

        if self.state=="chase":
            attack_range = 28 if self.kind=="crawler" else (260 if self.kind=="spitter" else 36)
            if dist > attack_range:
                if dist > 0:
                    nx = self.x + dx/dist*self.speed*dt
                    ny = self.y + dy/dist*self.speed*dt
                    if not self._coll(nx,self.y,gmap): self.x=nx
                    if not self._coll(self.x,ny,gmap): self.y=ny
            else:
                if self.cd<=0:
                    if self.kind=="spitter":
                        if dist>0:
                            projectiles.append(Projectile(self.x,self.y,dx/dist*220,dy/dist*220,self.dmg))
                        self.cd=1.2
                    else:
                        if dist < (self.r+player.r+8):
                            player.take_damage(self.dmg)
                        self.cd = 0.8 if self.kind=="crawler" else 1.4
        else:
            self.patrol_t -= dt
            if self.patrol_t <= 0:
                self.patrol_t = random.uniform(1.0, 2.5)
                self.target = (self.x + random.uniform(-80,80), self.y + random.uniform(-80,80))
            tx,ty=self.target
            ddx=tx-self.x; ddy=ty-self.y; dd=math.hypot(ddx,ddy)
            if dd>4:
                nx = self.x + ddx/dd*self.speed*0.5*dt
                ny = self.y + ddy/dd*self.speed*0.5*dt
                if not self._coll(nx,self.y,gmap): self.x=nx
                if not self._coll(self.x,ny,gmap): self.y=ny

    def _coll(self,x,y,gmap):
        return gmap.is_solid(int(x//TILE), int(y//TILE))

    def draw(self, surf, cx, cy):
        x=int(self.x-cx); y=int(self.y-cy)
        col = (255,255,255) if self.flash>0 else self.color
        if self.kind=="crawler":
            pygame.draw.polygon(surf,col,[(x,y-self.r),(x+self.r,y+self.r),(x-self.r,y+self.r)])
        elif self.kind=="spitter":
            pygame.draw.rect(surf,col,(x-self.r,y-self.r,self.r*2,self.r*2),border_radius=4)
        else:
            pygame.draw.circle(surf,col,(x,y),self.r)
            pygame.draw.circle(surf,(40,0,40),(x,y),self.r,3)
        bw=max(20,self.r*2)
        pygame.draw.rect(surf,(40,0,0),(x-bw//2,y-self.r-8,bw,3))
        pygame.draw.rect(surf,(255,80,80),(x-bw//2,y-self.r-8,int(bw*self.hp/self.max_hp),3))
