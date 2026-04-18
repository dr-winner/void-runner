"""Main game loop, scenes, save/load, loot, crafting, screen shake."""
import pygame, random, json, os, math, sys
from map import GameMap, TILE
from player import Player
from enemy import Enemy, Projectile
import ui

SCREEN_W, SCREEN_H = 1024, 720
FPS = 60
SAVE_PATH = "voidrunner_save.json"

LOOT_TABLE = [
    {"name":"Plasma Cell","type":"consumable_en","value":20},
    {"name":"Med Pack","type":"consumable_hp","value":30},
    {"name":"Stim","type":"consumable_hp","value":15},
    {"name":"Pulse Blade","type":"weapon","value":1},
    {"name":"Nano Plate","type":"armor","value":1},
]

class Game:
    def __init__(self):
        pygame.init()
        try: pygame.mixer.init()
        except: pass
        self.screen = pygame.display.set_mode((SCREEN_W, SCREEN_H))
        pygame.display.set_caption("VOID RUNNER")
        self.clock = pygame.time.Clock()
        self.font = pygame.font.SysFont("consolas",16,bold=True)
        self.shake = 0.0
        self.message = ""
        self.message_t = 0.0
        self._init_sounds()
        self.state = "menu"  # menu, playing, inventory, gameover, victory
        self.gmap=None; self.player=None; self.enemies=[]; self.projectiles=[]
        self.kills=0; self.run_time=0.0
        self.show_inv=False
        self.crafting_pick=[]

    # ----- SFX (procedurally generated tones) -----
    def _init_sounds(self):
        self.sfx={}
        try:
            import numpy as np
            sr=22050
            def tone(freq, dur, vol=0.3, decay=True):
                t=np.linspace(0,dur,int(sr*dur),False)
                wave=np.sin(2*np.pi*freq*t)
                if decay: wave*=np.exp(-3*t)
                a=(wave*vol*32767).astype(np.int16)
                stereo=np.column_stack([a,a])
                return pygame.sndarray.make_sound(stereo)
            self.sfx["hit"]=tone(180,0.12)
            self.sfx["shoot"]=tone(700,0.08,0.2)
            self.sfx["pickup"]=tone(880,0.15,0.25)
            self.sfx["levelup"]=tone(1200,0.4,0.3)
            self.sfx["hurt"]=tone(120,0.2,0.4)
        except Exception:
            self.sfx={}

    def play(self, name):
        if name in self.sfx:
            try: self.sfx[name].play()
            except: pass

    # ----- save / load -----
    def save(self):
        if not self.player or not self.gmap: return
        data={
            "seed":self.gmap.seed,
            "player":{
                "x":self.player.x,"y":self.player.y,"hp":self.player.hp,"max_hp":self.player.max_hp,
                "energy":self.player.energy,"max_energy":self.player.max_energy,
                "level":self.player.level,"xp":self.player.xp,"xp_next":self.player.xp_next,
                "stat_points":self.player.stat_points,
                "speed_stat":self.player.speed_stat,"attack_stat":self.player.attack_stat,
                "defense_stat":self.player.defense_stat,
                "inventory":self.player.inventory,"ship_parts":self.player.ship_parts,
            },
            "fog":[[1 if c else 0 for c in col] for col in self.gmap.fog],
            "ship_parts":self.gmap.ship_parts,
            "kills":self.kills,"run_time":self.run_time,
        }
        try:
            with open(SAVE_PATH,"w") as f: json.dump(data,f)
        except: pass

    def load(self):
        if not os.path.exists(SAVE_PATH): return False
        try:
            with open(SAVE_PATH) as f: d=json.load(f)
            self.gmap=GameMap(seed=d["seed"])
            self.gmap.fog=[[bool(c) for c in col] for col in d["fog"]]
            self.gmap.ship_parts=[tuple(p) for p in d["ship_parts"]]
            p=d["player"]
            self.player=Player(p["x"],p["y"])
            for k,v in p.items():
                setattr(self.player,k,v)
            self.kills=d.get("kills",0); self.run_time=d.get("run_time",0)
            self._spawn_enemies()
            return True
        except Exception as e:
            print("load failed",e); return False

    # ----- world setup -----
    def new_game(self):
        self.gmap=GameMap()
        sx,sy=self.gmap.spawn
        self.player=Player(sx*TILE+TILE//2, sy*TILE+TILE//2)
        self.enemies=[]; self.projectiles=[]; self.kills=0; self.run_time=0
        self._spawn_enemies()
        if os.path.exists(SAVE_PATH):
            try: os.remove(SAVE_PATH)
            except: pass

    def _spawn_enemies(self):
        rng=random.Random(self.gmap.seed+7)
        self.enemies=[]
        for _ in range(40):
            for _ in range(40):
                x=rng.randint(2,self.gmap.w-3); y=rng.randint(2,self.gmap.h-3)
                if self.gmap.is_solid(x,y): continue
                if abs(x-self.gmap.spawn[0])<8 and abs(y-self.gmap.spawn[1])<8: continue
                kind=rng.choice(["crawler","crawler","spitter"])
                self.enemies.append(Enemy(x*TILE+TILE//2,y*TILE+TILE//2,kind))
                break
        # 1 guardian near escape pod
        ex,ey=self.gmap.escape_pod
        self.enemies.append(Enemy(ex*TILE-100, ey*TILE+40, "guardian"))

    # ----- main loop -----
    def run(self):
        while True:
            dt = self.clock.tick(FPS)/1000.0
            self.handle_events()
            if self.state=="playing":
                self.update(dt)
            self.draw()
            pygame.display.flip()

    def quit(self):
        if self.state in ("playing","inventory"): self.save()
        pygame.quit(); sys.exit()

    def handle_events(self):
        for e in pygame.event.get():
            if e.type==pygame.QUIT: self.quit()
            if e.type==pygame.KEYDOWN:
                if e.key==pygame.K_ESCAPE: self.quit()
                if self.state=="menu":
                    if e.key==pygame.K_RETURN:
                        if not self.load(): self.new_game()
                        self.state="playing"
                    if e.key==pygame.K_n:
                        self.new_game(); self.state="playing"
                elif self.state in ("playing","inventory"):
                    if e.key==pygame.K_i:
                        self.show_inv = not self.show_inv
                        self.state = "inventory" if self.show_inv else "playing"
                    elif e.key==pygame.K_c and self.player.stat_points>0:
                        # cycle: HP+ on each press into attack/def/speed by repeats
                        self.player.attack_stat += 1
                        self.player.stat_points -= 1
                        self._msg("ATTACK +1")
                    elif e.key==pygame.K_e:
                        self._interact()
                    elif self.state=="inventory":
                        # 1-9, 0 use slots
                        keymap = {pygame.K_1:0,pygame.K_2:1,pygame.K_3:2,pygame.K_4:3,
                                  pygame.K_5:4,pygame.K_6:5,pygame.K_7:6,pygame.K_8:7,
                                  pygame.K_9:8,pygame.K_0:9}
                        if e.key in keymap:
                            self.player.use_item(keymap[e.key])
                    elif e.key==pygame.K_SPACE:
                        atk=self.player.melee()
                        if atk: self._do_melee(atk)
                    elif e.key==pygame.K_f:
                        sh=self.player.shoot()
                        if sh:
                            x,y,vx,vy,dmg=sh
                            self.projectiles.append(Projectile(x,y,vx*420,vy*420,dmg,hostile=False))
                            self.play("shoot")
                elif self.state in ("gameover","victory"):
                    if e.key==pygame.K_r:
                        self.new_game(); self.state="playing"
            if e.type==pygame.MOUSEBUTTONDOWN and self.state=="playing":
                if e.button==1:
                    atk=self.player.melee()
                    if atk: self._do_melee(atk)
                elif e.button==3:
                    sh=self.player.shoot()
                    if sh:
                        x,y,vx,vy,dmg=sh
                        self.projectiles.append(Projectile(x,y,vx*420,vy*420,dmg,hostile=False))
                        self.play("shoot")

    def _msg(self, txt):
        self.message=txt; self.message_t=2.5

    def _interact(self):
        px,py=int(self.player.x//TILE), int(self.player.y//TILE)
        # Workbench
        for (wx,wy) in self.gmap.workbenches:
            if abs(wx-px)<=1 and abs(wy-py)<=1:
                self._craft(); return
        # Escape pod
        ex,ey=self.gmap.escape_pod
        if abs(ex-px)<=1 and abs(ey-py)<=1:
            if self.player.ship_parts>=5:
                self.state="victory"
                if os.path.exists(SAVE_PATH):
                    try: os.remove(SAVE_PATH)
                    except: pass
            else:
                self._msg(f"Need {5-self.player.ship_parts} more ship parts.")

    def _craft(self):
        # Combine first two weapons OR two armors -> upgraded
        weapons=[i for i,it in enumerate(self.player.inventory) if it["type"]=="weapon"]
        armors=[i for i,it in enumerate(self.player.inventory) if it["type"]=="armor"]
        if len(weapons)>=2:
            for i in sorted(weapons[:2],reverse=True): self.player.inventory.pop(i)
            self.player.attack_stat += 3
            self._msg("Crafted: Pulse Lance (+3 ATK)")
            self.play("levelup")
        elif len(armors)>=2:
            for i in sorted(armors[:2],reverse=True): self.player.inventory.pop(i)
            self.player.defense_stat += 3
            self._msg("Crafted: Aegis Shell (+3 DEF)")
            self.play("levelup")
        else:
            self._msg("Need 2 weapons or 2 armors to craft.")

    def _do_melee(self, atk):
        ax,ay,dmg,r=atk
        self.shake=max(self.shake,0.15)
        self.play("hit")
        for en in self.enemies:
            if not en.alive: continue
            if (en.x-ax)**2+(en.y-ay)**2 <= (r+en.r)**2:
                en.damage(dmg)

    def update(self, dt):
        self.run_time += dt
        if self.message_t>0: self.message_t -= dt
        self.shake = max(0,self.shake-dt)
        keys = pygame.key.get_pressed()
        prev_hp = self.player.hp
        self.player.update(dt, keys, self.gmap)
        for en in self.enemies:
            if en.alive: en.update(dt, self.player, self.gmap, self.projectiles)
        # Projectiles
        for p in self.projectiles:
            p.update(dt, self.gmap)
            if not p.alive: continue
            if p.hostile:
                if (p.x-self.player.x)**2+(p.y-self.player.y)**2 < (self.player.r+4)**2:
                    self.player.take_damage(p.dmg); p.alive=False
            else:
                for en in self.enemies:
                    if not en.alive: continue
                    if (p.x-en.x)**2+(p.y-en.y)**2 < (en.r+4)**2:
                        en.damage(p.dmg); p.alive=False
                        if en.kind=="guardian": self.shake=max(self.shake,0.3)
                        break
        self.projectiles=[p for p in self.projectiles if p.alive]
        # Dead enemies
        for en in self.enemies:
            if not en.alive and not getattr(en,"_loot",False):
                en._loot=True
                self.kills += 1
                self.player.add_xp(en.xp)
                self.play("levelup" if en.kind=="guardian" else "hit")
                # Drop loot
                if random.random() < (0.95 if en.kind=="guardian" else 0.45):
                    drop = dict(random.choice(LOOT_TABLE))
                    self.player.add_item(drop)
                    self._msg(f"Picked up: {drop['name']}")
                    self.play("pickup")
        # Pick up ship parts (walk into them)
        px,py=int(self.player.x//TILE), int(self.player.y//TILE)
        for sp in list(self.gmap.ship_parts):
            if abs(sp[0]-px)<=0 and abs(sp[1]-py)<=0:
                self.gmap.ship_parts.remove(sp)
                self.player.add_item({"name":"Ship Part","type":"ship_part","value":1})
                self._msg(f"SHIP PART {self.player.ship_parts}/5")
                self.play("pickup")
        # Hurt screen shake
        if self.player.hp < prev_hp:
            self.shake=max(self.shake,0.2); self.play("hurt")
        if self.player.hp <= 0:
            self.state="gameover"
            if os.path.exists(SAVE_PATH):
                try: os.remove(SAVE_PATH)
                except: pass

    def draw(self):
        self.screen.fill((6,8,16))
        if self.state=="menu":
            ui.draw_center_screen(self.screen,
                ["VOID RUNNER",
                 "[Enter] Continue / Start",
                 "[N] New game",
                 "[Esc] Quit",
                 "",
                 "WASD move  Space melee  F/RClick shoot",
                 "I inventory  E interact  C spend stat point"],
                SCREEN_W,SCREEN_H,(180,220,255))
            return
        # camera (with shake)
        sx = (random.uniform(-1,1) if self.shake>0 else 0) * 8 * self.shake
        sy = (random.uniform(-1,1) if self.shake>0 else 0) * 8 * self.shake
        cam_x = int(self.player.x - SCREEN_W//2 + sx)
        cam_y = int(self.player.y - SCREEN_H//2 + sy)
        self.gmap.draw(self.screen, cam_x, cam_y, SCREEN_W, SCREEN_H)
        for en in self.enemies:
            if en.alive: en.draw(self.screen, cam_x, cam_y)
        for p in self.projectiles: p.draw(self.screen, cam_x, cam_y)
        self.player.draw(self.screen, cam_x, cam_y)
        ui.draw_hud(self.screen, self.player, self.gmap, SCREEN_W, SCREEN_H)
        ui.draw_minimap(self.screen, self.gmap, self.player, SCREEN_W, SCREEN_H)
        if self.message_t>0:
            ui.draw_message(self.screen, self.message, SCREEN_W, SCREEN_H)
        if self.state=="inventory":
            ui.draw_inventory(self.screen, self.player, SCREEN_W, SCREEN_H)
        if self.state=="gameover":
            ui.draw_center_screen(self.screen,
                ["YOU DIED",
                 f"Kills: {self.kills}   Time: {int(self.run_time)}s",
                 f"Ship parts: {self.player.ship_parts}/5",
                 "[R] Restart   [Esc] Quit"],
                SCREEN_W,SCREEN_H,(255,120,120))
        if self.state=="victory":
            ui.draw_center_screen(self.screen,
                ["ESCAPED!",
                 "You repaired your ship and broke orbit.",
                 f"Kills: {self.kills}   Time: {int(self.run_time)}s",
                 "[R] New run   [Esc] Quit"],
                SCREEN_W,SCREEN_H,(120,255,180))
