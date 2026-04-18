"""HUD, minimap, inventory, menus."""
import pygame
from map import TILE, BIOME_NAMES, BIOME_COLORS

def draw_hud(surf, player, gmap, screen_w, screen_h):
    # HP bar
    pygame.draw.rect(surf,(20,20,30),(20,20,220,18))
    pygame.draw.rect(surf,(220,60,80),(20,20,int(220*player.hp/player.max_hp),18))
    pygame.draw.rect(surf,(255,255,255),(20,20,220,18),1)
    f = pygame.font.SysFont("consolas", 14, bold=True)
    surf.blit(f.render(f"HP {int(player.hp)}/{player.max_hp}",True,(255,255,255)),(28,22))

    pygame.draw.rect(surf,(20,20,30),(20,44,220,14))
    pygame.draw.rect(surf,(80,180,255),(20,44,int(220*player.energy/player.max_energy),14))
    pygame.draw.rect(surf,(255,255,255),(20,44,220,14),1)
    surf.blit(f.render(f"EN {int(player.energy)}/{player.max_energy}",True,(255,255,255)),(28,44))

    # Level / XP
    surf.blit(f.render(f"LV {player.level}  XP {player.xp}/{player.xp_next}",True,(180,220,255)),(20,64))
    if player.stat_points>0:
        surf.blit(f.render(f"[C] {player.stat_points} stat point(s)",True,(255,220,80)),(20,82))

    # Ship parts
    parts_txt = f.render(f"SHIP PARTS {player.ship_parts}/5",True,(255,230,90))
    surf.blit(parts_txt,(screen_w-parts_txt.get_width()-20,20))

    # Biome name
    tx = int(player.x//TILE); ty = int(player.y//TILE)
    bname = BIOME_NAMES[gmap.biome_at(tx,ty)]
    bsurf = f.render(bname,True,(200,200,255))
    surf.blit(bsurf,(screen_w//2-bsurf.get_width()//2,20))

def draw_minimap(surf, gmap, player, screen_w, screen_h):
    mw, mh = 160, 120
    ox, oy = screen_w-mw-20, screen_h-mh-20
    pygame.draw.rect(surf,(0,0,0),(ox-2,oy-2,mw+4,mh+4))
    pygame.draw.rect(surf,(20,20,40),(ox,oy,mw,mh))
    sx = mw / gmap.w; sy = mh / gmap.h
    for x in range(gmap.w):
        for y in range(gmap.h):
            if gmap.fog[x][y]: continue
            b = gmap.biome[x][y]
            col = BIOME_COLORS[b][0]
            pygame.draw.rect(surf,col,(ox+int(x*sx),oy+int(y*sy),max(1,int(sx)),max(1,int(sy))))
    # parts
    for (x,y) in gmap.ship_parts:
        if gmap.fog[x][y]: continue
        pygame.draw.rect(surf,(255,230,90),(ox+int(x*sx)-1,oy+int(y*sy)-1,3,3))
    # escape pod
    ex,ey=gmap.escape_pod
    pygame.draw.rect(surf,(120,220,255),(ox+int(ex*sx)-2,oy+int(ey*sy)-2,4,4))
    # player
    px=int(player.x//TILE); py=int(player.y//TILE)
    pygame.draw.rect(surf,(255,255,255),(ox+int(px*sx)-2,oy+int(py*sy)-2,4,4))
    pygame.draw.rect(surf,(120,220,255),(ox,oy,mw,mh),1)

def draw_inventory(surf, player, screen_w, screen_h):
    overlay = pygame.Surface((screen_w,screen_h), pygame.SRCALPHA)
    overlay.fill((0,0,0,180))
    surf.blit(overlay,(0,0))
    f = pygame.font.SysFont("consolas",16,bold=True)
    title = f.render("INVENTORY  [1-9,0] use   [I] close",True,(180,220,255))
    surf.blit(title,(screen_w//2-title.get_width()//2,80))
    cols=5; cell=64; gap=10
    gw=cols*cell+(cols-1)*gap
    x0=screen_w//2-gw//2; y0=120
    for i in range(20):
        cx=x0+(i%cols)*(cell+gap); cy=y0+(i//cols)*(cell+gap)
        pygame.draw.rect(surf,(20,30,50),(cx,cy,cell,cell))
        pygame.draw.rect(surf,(80,140,200),(cx,cy,cell,cell),1)
        if i<len(player.inventory):
            it=player.inventory[i]
            colmap={"weapon":(220,120,120),"armor":(120,200,200),"consumable_hp":(80,255,140),
                    "consumable_en":(120,180,255),"ship_part":(255,230,90)}
            pygame.draw.circle(surf,colmap.get(it["type"],(200,200,200)),(cx+cell//2,cy+cell//2-6),12)
            name = pygame.font.SysFont("consolas",10).render(it["name"][:8],True,(230,230,230))
            surf.blit(name,(cx+4,cy+cell-14))
            num = pygame.font.SysFont("consolas",10,bold=True).render(str((i+1)%10),True,(255,255,255))
            surf.blit(num,(cx+4,cy+4))

def draw_message(surf, text, screen_w, screen_h, y_off=140):
    f=pygame.font.SysFont("consolas",14,bold=True)
    s=f.render(text,True,(255,255,255))
    bg=pygame.Rect(screen_w//2-s.get_width()//2-8,y_off,s.get_width()+16,s.get_height()+8)
    pygame.draw.rect(surf,(0,0,0),bg)
    pygame.draw.rect(surf,(120,220,255),bg,1)
    surf.blit(s,(bg.x+8,bg.y+4))

def draw_center_screen(surf, lines, screen_w, screen_h, color=(255,255,255)):
    overlay = pygame.Surface((screen_w,screen_h), pygame.SRCALPHA)
    overlay.fill((0,0,0,200)); surf.blit(overlay,(0,0))
    f_big=pygame.font.SysFont("consolas",36,bold=True)
    f_small=pygame.font.SysFont("consolas",16)
    y=screen_h//2 - len(lines)*16
    for i,l in enumerate(lines):
        font = f_big if i==0 else f_small
        s=font.render(l,True,color)
        surf.blit(s,(screen_w//2-s.get_width()//2,y))
        y += font.get_height()+6
