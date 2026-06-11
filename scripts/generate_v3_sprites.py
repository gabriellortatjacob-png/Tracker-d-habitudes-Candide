#!/usr/bin/env python3
"""Generate transparent PNG sprites for V3 garden.
No external dependency: a tiny RGBA rasterizer + stdlib PNG writer.
"""
from __future__ import annotations
import json, math, os, random, struct, zlib
from pathlib import Path

OUT = Path('assets/sprites')
W = H = 128


def rgba(hex_color, a=255):
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 3:
        hex_color = ''.join(ch * 2 for ch in hex_color)
    return tuple(int(hex_color[i:i+2], 16) for i in (0,2,4)) + (a,)

class Img:
    def __init__(self, w=W, h=H):
        self.w=w; self.h=h; self.p=[0]*(w*h*4)
    def blend(self,x,y,c):
        x=int(round(x)); y=int(round(y))
        if x<0 or y<0 or x>=self.w or y>=self.h: return
        r,g,b,a=c; idx=(y*self.w+x)*4; da=self.p[idx+3]
        aa=a/255; ia=1-aa
        self.p[idx]=int(r*aa+self.p[idx]*ia); self.p[idx+1]=int(g*aa+self.p[idx+1]*ia); self.p[idx+2]=int(b*aa+self.p[idx+2]*ia); self.p[idx+3]=min(255,int(a+da*ia))
    def line(self,x1,y1,x2,y2,c,width=2):
        steps=max(1,int(abs(x2-x1)+abs(y2-y1)))
        for i in range(steps+1):
            t=i/steps; x=x1+(x2-x1)*t; y=y1+(y2-y1)*t
            self.ellipse(x,y,width,width,c)
    def poly(self,pts,c,outline=None,ow=2):
        minx=max(0,int(min(x for x,y in pts))); maxx=min(self.w-1,int(max(x for x,y in pts))+1)
        miny=max(0,int(min(y for x,y in pts))); maxy=min(self.h-1,int(max(y for x,y in pts))+1)
        for y in range(miny,maxy+1):
            for x in range(minx,maxx+1):
                inside=False; j=len(pts)-1
                for i in range(len(pts)):
                    xi,yi=pts[i]; xj,yj=pts[j]
                    if ((yi>y)!=(yj>y)) and x < (xj-xi)*(y-yi)/(yj-yi+1e-9)+xi: inside=not inside
                    j=i
                if inside: self.blend(x,y,c)
        if outline:
            for i in range(len(pts)):
                x1,y1=pts[i]; x2,y2=pts[(i+1)%len(pts)]
                self.line(x1,y1,x2,y2,outline,ow)
    def ellipse(self,cx,cy,rx,ry,c,outline=None,ow=2):
        for y in range(int(cy-ry)-ow, int(cy+ry)+ow+1):
            for x in range(int(cx-rx)-ow, int(cx+rx)+ow+1):
                v=((x-cx)/(rx+1e-9))**2+((y-cy)/(ry+1e-9))**2
                if v<=1: self.blend(x,y,c)
                elif outline and v<=1+0.16*ow: self.blend(x,y,outline)
    def rect(self,x,y,w,h,c,outline=None):
        for yy in range(int(y),int(y+h)):
            for xx in range(int(x),int(x+w)): self.blend(xx,yy,c)
        if outline:
            self.line(x,y,x+w,y,outline,2); self.line(x+w,y,x+w,y+h,outline,2); self.line(x+w,y+h,x,y+h,outline,2); self.line(x,y+h,x,y,outline,2)
    def save(self,path):
        raw=b''.join(b'\x00'+bytes(self.p[y*self.w*4:(y+1)*self.w*4]) for y in range(self.h))
        def chunk(t,d): return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
        data=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',self.w,self.h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
        Path(path).write_bytes(data)

def shadow(img, cx=68, cy=94, rx=38, ry=16): img.ellipse(cx+5,cy+8,rx,ry,rgba('#000000',95))
def diamond(img, top, right, bottom, left, topc, leftc, rightc, outline='#21451f'):
    # chunky isometric tile/object: top 85%, left 70%, right 100%ish
    drop=12
    img.poly([left,bottom,(bottom[0],bottom[1]+drop),(left[0],left[1]+drop)], rgba(leftc), rgba(outline), 2)
    img.poly([right,bottom,(bottom[0],bottom[1]+drop),(right[0],right[1]+drop)], rgba(rightc), rgba(outline), 2)
    img.poly([top,right,bottom,left], rgba(topc), rgba(outline), 2)

def add_sprinkles(img, colors, seed):
    r=random.Random(seed)
    for _ in range(22):
        x=r.randint(28,99); y=r.randint(42,76)
        if abs(x-64)/45 + abs(y-61)/24 < 1:
            img.ellipse(x,y,r.randint(1,3),r.randint(1,3),rgba(r.choice(colors),210))

def tile(kind, frame=0):
    img=Img(); shadow(img,64,76,42,17)
    if kind=='grass_base':
        diamond(img,(64,31),(109,56),(64,82),(19,56),'#68d65d','#399642','#50b84b'); add_sprinkles(img,['#78e46c','#5ec955','#53b34d'],1)
    elif kind=='grass_flower':
        diamond(img,(64,31),(109,56),(64,82),(19,56),'#6fda61','#3d9d44','#53bc4e'); add_sprinkles(img,['#ffec6b','#ff7abb','#ffffff'],2)
    elif kind=='grass_blades':
        diamond(img,(64,31),(109,56),(64,82),(19,56),'#63cf56','#368f3f','#4fb34a')
        for i in range(34):
            r=random.Random(8+i); x=r.randint(29,98); y=r.randint(42,75)
            img.line(x,y,x+r.randint(-3,3),y-r.randint(4,9),rgba('#2b8c3b',220),1)
    elif kind=='path':
        diamond(img,(64,31),(109,56),(64,82),(19,56),'#c98b4a','#8d5b34','#ad7541'); add_sprinkles(img,['#e3aa63','#9a6539','#d9984e'],4)
    elif kind=='water':
        cols=['#46c7ff','#38bdf8','#65d7ff']; diamond(img,(64,31),(109,56),(64,82),(19,56),cols[frame%3],'#2479b6','#2da3df')
        for i in range(4): img.line(38+i*15,55+math.sin(frame+i)*5,49+i*14,51+math.cos(frame+i)*4,rgba('#e1fbff',185),2)
    return img

def trunk(img, x=64, y=76, h=34):
    img.poly([(x-8,y),(x+8,y),(x+6,y-h),(x-6,y-h)],rgba('#9c6030'),rgba('#4f321f'),2)

def tree(level):
    img=Img(); shadow(img,66,94,34,12); trunk(img,64,85,38)
    if level==1: img.ellipse(64,48,19,22,rgba('#55c957'),rgba('#21451f'),2)
    elif level==2:
        for dx,dy,rx in [(-12,0,22),(10,-4,24),(0,-18,22)]: img.ellipse(64+dx,50+dy,rx,23,rgba('#50c856'),rgba('#21451f'),2)
    elif level==3:
        for dx,dy,rx in [(-15,2,24),(13,-4,26),(0,-20,24)]: img.ellipse(64+dx,51+dy,rx,24,rgba('#45bb4e'),rgba('#21451f'),2)
        for x,y in [(53,49),(70,42),(78,58),(59,63)]: img.ellipse(x,y,4,4,rgba('#ff4f45'),rgba('#8d251f'),1)
    else:
        for dx,dy,rx in [(-17,2,25),(14,-5,28),(0,-24,25)]: img.ellipse(64+dx,50+dy,rx,25,rgba('#41ca8f'),rgba('#153b34'),2)
        for x,y in [(46,44),(82,47),(67,29),(58,67)]: img.ellipse(x,y,5,5,rgba('#78ecff',230),rgba('#ffffff',160),1)
    return img

def bush(level):
    img=Img(); shadow(img,65,93,32,12)
    colors=['#46bd49','#55cf55','#38b75d','#35c89c']; c=colors[level-1]
    for dx,dy,rx in [(-20,2,19),(0,-5,25),(20,2,19),(-6,8,22)]: img.ellipse(64+dx,66+dy,rx,20,rgba(c),rgba('#21451f'),2)
    if level>=2:
        fc='#ff85c7' if level<4 else '#7ff6ff'
        for x,y in [(48,61),(65,55),(80,65),(58,74)]: img.ellipse(x,y,4,4,rgba(fc),rgba('#ffffff',120),1)
    if level>=3: img.line(42,70,88,64,rgba('#286a2b'),3)
    return img

def flowers(level):
    img=Img(); shadow(img,65,94,35,11); diamond(img,(64,55),(99,73),(64,92),(29,73),'#8c5a34','#6d3b22','#9a6237')
    palettes=[['#ffffff','#ffe46d'],['#ff3d6e','#ffd44d'],['#ff6aa7','#d81b60'],['#8ff9ff','#d886ff']]
    for i,x in enumerate([43,53,63,73,83]):
        img.line(x,68,x,52-(i%2)*4,rgba('#267d36'),2)
        img.ellipse(x,50-(i%2)*4,6,6,rgba(palettes[level-1][i%2]),rgba('#21451f'),1)
    return img

def house(level):
    img=Img(); shadow(img,65,96,42,15)
    body=['#d88a42','#e5a34e','#f0b35e','#f4cc74'][level-1]; roof=['#b94c48','#d25a4d','#de704e','#7c6bf2'][level-1]
    diamond(img,(64,53),(101,73),(64,96),(27,73),body,'#a96234','#ce7f43')
    img.poly([(29,61),(64,34),(99,61),(64,48)],rgba(roof),rgba('#4a2a25'),2)
    img.rect(58,73,12,20,rgba('#5d3a24'),rgba('#21451f'))
    if level>=3: img.ellipse(42,82,7,9,rgba('#5bd560'),rgba('#21451f'),1); img.ellipse(86,80,7,9,rgba('#5bd560'),rgba('#21451f'),1)
    if level>=4: img.ellipse(64,31,8,8,rgba('#8ff9ff',180),rgba('#ffffff',120),1)
    return img

def farm(level):
    img=Img(); shadow(img,65,96,45,15)
    if level==1:
        diamond(img,(64,59),(104,78),(64,99),(24,78),'#b97540','#7b4a2b','#9d6338')
        for x in [38,52,76,90]: img.rect(x,59,4,27,rgba('#8a4d28'),rgba('#4a2b1a'))
    elif level==2:
        img=farm(1); img.ellipse(54,68,8,6,rgba('#fff'),rgba('#333'),1); img.ellipse(77,70,8,6,rgba('#f6d59a'),rgba('#333'),1)
    else:
        diamond(img,(64,56),(104,75),(64,98),(24,75),'#c86f32','#8d4428','#ad5e2f')
        img.poly([(30,61),(64,36),(98,61),(64,49)],rgba('#f6e8d0'),rgba('#4a2a25'),2)
        img.rect(58,68,14,25,rgba('#6b3b26'),rgba('#21451f'))
        if level==4:
            img.ellipse(91,52,8,8,rgba('#ffe66d'),rgba('#21451f'),1); img.line(91,52,91,39,rgba('#8b5b35'),2)
    return img

def vegetable(level):
    img=Img(); shadow(img,65,95,40,12); diamond(img,(64,57),(104,76),(64,98),(24,76),'#a36538','#704127','#8b5433')
    if level>=2:
        for x in [42,55,68,81]: img.ellipse(x,63,6,13,rgba('#3ebf4e'),rgba('#21451f'),1)
    if level>=3:
        for x in [48,64,80]: img.ellipse(x,75,5,9,rgba('#ff8a36'),rgba('#7a351a'),1)
    if level>=4: img.ellipse(64,50,14,7,rgba('#91fff5',180),rgba('#ffffff',140),1)
    return img

def fountain(level):
    img=Img(); shadow(img,65,96,38,13); diamond(img,(64,61),(101,78),(64,99),(27,78),'#80d8ff','#408ec1','#5cbdee')
    if level>=2: img.line(64,64,64,41,rgba('#d9fbff',210),4); img.ellipse(64,43,7,5,rgba('#d9fbff',220))
    if level>=3: img.ellipse(64,66,21,9,rgba('#4ab8ff',180),rgba('#21451f'),1); img.ellipse(64,55,12,8,rgba('#c8f5ff'),rgba('#21451f'),1)
    if level>=4: img.ellipse(64,54,26,18,rgba('#76efff',120)); img.ellipse(64,38,9,9,rgba('#ffffff',190))
    return img

def deco(kind, level=1):
    img=Img(); shadow(img,65,95,30,10)
    if kind=='stone':
        img.ellipse(58,72,20+level*4,15+level*2,rgba('#9da7ad'),rgba('#3f555c'),2); img.ellipse(72,67,15,12,rgba('#bac4c8'),rgba('#3f555c'),2)
    elif kind=='fence':
        for x in [42,58,74,90]: img.rect(x,57,7,35,rgba('#b66c32'),rgba('#5a351d'))
        img.rect(35,66,60,6,rgba('#d28a45'),rgba('#5a351d')); img.rect(35,80,60,6,rgba('#d28a45'),rgba('#5a351d'))
        if level==2: img.ellipse(70,55,5,5,rgba('#ffdc5a'),rgba('#5a351d'),1)
    elif kind=='lamp':
        img.rect(61,50,6,42,rgba('#5a4134'),rgba('#21451f'))
        img.ellipse(64,42,13,13,rgba('#ffe17a',230),rgba('#6a4a20'),2)
        if level==2: img.ellipse(64,42,22,20,rgba('#fff3a1',90))
    return img

def obstacle(kind):
    img=Img(); shadow(img,65,95,34,12)
    if kind=='rock_small': img.ellipse(64,72,24,17,rgba('#9aa5aa'),rgba('#344950'),2); img.ellipse(57,64,11,8,rgba('#c6d0d2'))
    elif kind=='rock_big': img.ellipse(58,75,28,18,rgba('#88949a'),rgba('#344950'),2); img.ellipse(77,68,21,16,rgba('#aab3b8'),rgba('#344950'),2)
    elif kind.startswith('weed'):
        col='#2e9840' if kind.endswith('1') else '#3e7a35'
        for i,x in enumerate([42,50,58,66,74,82,90]): img.ellipse(x,73,6,25,rgba(col),rgba('#21451f'),1)
        if kind.endswith('2'): img.ellipse(63,53,5,5,rgba('#8b2440'),rgba('#42131d'),1)
    elif kind=='stump':
        img.ellipse(64,67,22,13,rgba('#a05f32'),rgba('#4b2b19'),2); img.rect(46,66,36,23,rgba('#8a4e2a'),rgba('#4b2b19')); img.ellipse(64,66,20,10,rgba('#c4874b'),rgba('#4b2b19'),2)
    return img

def save(name,img,manifest,kind='sprite'):
    path=OUT/f'{name}.png'; img.save(path); manifest[name]=str(path).replace('\\','/')


def main():
    OUT.mkdir(parents=True, exist_ok=True); manifest={}
    for k in ['grass_base','grass_flower','grass_blades','path']: save('tile_'+k,tile(k),manifest,'tile')
    for f in range(3): save(f'tile_water_{f+1}',tile('water',f),manifest,'tile')
    for name,fn,levels in [('tree',tree,4),('bush',bush,4),('flowers',flowers,4),('house',house,4),('farm',farm,4),('vegetable',vegetable,4),('fountain',fountain,4)]:
        for lvl in range(1,levels+1): save(f'{name}_n{lvl}',fn(lvl),manifest)
    for name in ['stone','fence','lamp']:
        for lvl in [1,2]: save(f'{name}_n{lvl}',deco(name,lvl),manifest)
    for name in ['rock_small','rock_big','weed_1','weed_2','stump']: save(name,obstacle(name),manifest)
    # preview sheet for visual review
    sheet=Img(1024,768); x=y=8
    for key in sorted(manifest):
        img_path=Path(manifest[key]); data=Img() # load omitted: create preview as colored slots + use filenames in manifest for reviewers
        # simple decorative swatch names are not text-rendered in this tiny rasterizer; actual files are the deliverable.
    Path(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
    print(f'Generated {len(manifest)} sprites in {OUT}')

if __name__=='__main__': main()
