#!/usr/bin/env python3
"""Build a static visual preview sheet from generated sprites for V3 review."""
import json, struct, zlib
from pathlib import Path
from generate_v3_sprites import Img, rgba

ROOT = Path('assets/sprites')

def read_png(path):
    data=Path(path).read_bytes(); pos=8; w=h=None; chunks=[]
    while pos < len(data):
        ln=struct.unpack('>I', data[pos:pos+4])[0]; typ=data[pos+4:pos+8]; payload=data[pos+8:pos+8+ln]; pos += 12+ln
        if typ == b'IHDR': w,h,bit,color,_,_,_=struct.unpack('>IIBBBBB', payload)
        elif typ == b'IDAT': chunks.append(payload)
        elif typ == b'IEND': break
    raw=zlib.decompress(b''.join(chunks)); out=[]; stride=w*4
    for y in range(h):
        assert raw[y*(stride+1)] == 0
        out.extend(raw[y*(stride+1)+1:y*(stride+1)+1+stride])
    img=Img(w,h); img.p=list(out); return img

def paste(dst, src, ox, oy, scale=1):
    for y in range(src.h):
        for x in range(src.w):
            idx=(y*src.w+x)*4
            a=src.p[idx+3]
            if a:
                for yy in range(scale):
                    for xx in range(scale):
                        dst.blend(ox+x*scale+xx, oy+y*scale+yy, tuple(src.p[idx:idx+4]))

def main():
    manifest=json.loads((ROOT/'manifest.json').read_text())
    sheet=Img(1280,900)
    # blue/green background
    for y in range(sheet.h):
        c=rgba('#80d7ff') if y<180 else rgba('#52bd45')
        for x in range(sheet.w): sheet.blend(x,y,c)
    # pseudo-garden composition using the actual sprites
    coords=[('tile_grass_base',580,120),('tile_grass_flower',676,168),('tile_grass_blades',484,168),('tile_path',580,216),('tile_water_1',772,216),('tile_water_2',868,264),('tile_water_3',964,312)]
    for key,x,y in coords: paste(sheet, read_png(ROOT/f'{key}.png'), x, y)
    objects=[('tree_n4',580,190),('house_n4',420,275),('farm_n4',720,310),('fountain_n4',890,355),('flowers_n4',535,350),('bush_n4',660,375),('vegetable_n4',770,435),('lamp_n2',965,445),('fence_n2',430,430),('rock_big',315,360),('weed_2',1030,382),('stump',500,500)]
    for key,x,y in objects: paste(sheet, read_png(ROOT/f'{key}.png'), x, y)
    # sprite catalog strip
    x=y=18
    for key in ['tile_grass_base','tile_grass_flower','tile_grass_blades','tile_path','tile_water_1','tree_n1','tree_n2','tree_n3','tree_n4','bush_n4','flowers_n4','house_n4','farm_n4','vegetable_n4','fountain_n4','stone_n2','fence_n2','lamp_n2','rock_small','rock_big','weed_1','weed_2','stump']:
        paste(sheet, read_png(ROOT/f'{key}.png'), x, y)
        x += 96
        if x > 1160: x=18; y += 112
    out=Path('v3-visual-preview.png'); sheet.save(out); print(out.resolve())
if __name__=='__main__': main()
