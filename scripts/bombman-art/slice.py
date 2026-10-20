import numpy as np, cv2, json, os, colorsys
from PIL import Image, ImageFilter, ImageEnhance, ImageOps
E='scripts/bombman-art/sources/'; OUT='bomberman/sprites/'  # run from repo root: python3 scripts/bombman-art/slice.py (needs numpy, opencv-python-headless, pillow)
S={k:np.array(Image.open(E+f).convert('RGB')) for k,f in [('00','00.jpeg'),('24','24.jpeg'),('21','21.jpeg'),('22','22.jpeg'),('23','23.jpeg')]}
G=256
CH=384  # character sprites (hero, rivals, robot) are cut from the 4x sheets at a larger grid
# 4x Real-ESRGAN (x4plus-anime) upscales of the two sprite sheets; masks are still computed on the
# original sheet (tuned tolerances), then the alpha is upsampled and applied to the cleaner 4x pixels.
X4={k:np.array(Image.open(E+f'{k}_x4.webp').convert('RGB')) for k in ('00','24') if os.path.exists(E+f'{k}_x4.webp')}
manifest={}

def cutout(sheet, box, tol=None, keep_ratio=0.08):
    x0,y0,x1,y1=box; im=S[sheet][y0:y1,x0:x1].astype(np.int32)
    h,w,_=im.shape
    border=np.concatenate([im[0],im[-1],im[:,0],im[:,-1]])
    bg=np.median(border,axis=0)
    d=np.sqrt(((im-bg)**2).sum(2))
    if tol is None: tol=26 if sheet=='00' else 30
    cand=(d<tol).astype(np.uint8)
    n,lab=cv2.connectedComponents(cand,connectivity=4)
    edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))
    bgm=np.isin(lab,[l for l in edge if l!=0]) & (cand==1)
    fg=(~bgm).astype(np.uint8)
    fg=cv2.morphologyEx(fg,cv2.MORPH_OPEN,np.ones((2,2),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(fg,8)
    if n>1:
        big=max(st[1:,4]); keep=[i for i in range(1,n) if st[i,4]>=big*keep_ratio]
        fg=np.isin(lab,keep).astype(np.uint8)
    # soft edge: ramp alpha by distance to bg colour on the boundary band
    soft=np.clip((d-tol*0.6)/(tol*1.2),0,1)
    inner=cv2.erode(fg,np.ones((3,3),np.uint8))
    alpha=np.where(inner==1,1.0,np.where(fg==1,soft,0.0))
    alpha=cv2.GaussianBlur(alpha.astype(np.float32),(3,3),0.6)
    if sheet in X4:
        big=X4[sheet][y0*4:y1*4,x0*4:x1*4]
        a4=cv2.resize(alpha.astype(np.float32),(big.shape[1],big.shape[0]),interpolation=cv2.INTER_CUBIC)
        a4=np.clip((a4-0.5)*1.7+0.5,0,1); a4=cv2.GaussianBlur(a4,(5,5),1.0)
        im,alpha=big,a4
    rgba=np.dstack([im.astype(np.uint8),(alpha*255).astype(np.uint8)])
    ys,xs=np.where(alpha>0.05)
    rgba=rgba[ys.min():ys.max()+1, xs.min():xs.max()+1]
    return Image.fromarray(rgba,'RGBA')

def fit(img, anchor='center', pad=10, size=G):
    w,h=img.size; s=min((size-2*pad)/w,(size-2*pad)/h)
    nw,nh=max(1,round(w*s)),max(1,round(h*s))
    # premultiplied resize to avoid dark fringes
    arr=np.array(img).astype(np.float32)/255; a=arr[...,3:4]
    pm=np.dstack([arr[...,:3]*a,a])
    pm=cv2.resize(pm,(nw,nh),interpolation=cv2.INTER_CUBIC if s>1 else cv2.INTER_AREA)
    pm=np.clip(pm,0,1); a2=pm[...,3:4]; rgb=np.where(a2>1e-3,pm[...,:3]/np.maximum(a2,1e-3),0)
    out=np.dstack([np.clip(rgb,0,1),a2])
    o=Image.fromarray((out*255).astype(np.uint8),'RGBA')
    if s>1.4: # gentle sharpen after upscaling the low-res source
        rgbI=o.convert('RGB').filter(ImageFilter.UnsharpMask(radius=2,percent=70,threshold=2)); rgbI.putalpha(o.getchannel('A')); o=rgbI
    canvas=Image.new('RGBA',(size,size),(0,0,0,0))
    x=(size-nw)//2; y=(size-nh)//2 if anchor=='center' else size-pad-nh
    canvas.alpha_composite(o,(x,y)); return canvas, s

def save(name, img, kind, src, how, anchor='center', **extra):
    path=OUT+name+'.webp'
    img.save(path,'WEBP',quality=86,method=6, **({'lossless':False}))
    manifest[name]={'file':name+'.webp','kind':kind,'source':src,'how':how,'anchor':anchor,**extra}

def hue_shift(img, deg, sat=1.0, protect_skin=True):
    arr=np.array(img.convert('RGBA')); rgb=arr[...,:3]
    hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV).astype(np.int32)  # H 0..179
    H,Sx,V=hsv[...,0],hsv[...,1],hsv[...,2]
    mask=np.ones_like(H,bool)
    if protect_skin:  # keep orange fur / tan skin; shift outfit (blue suit, red scarf)
        mask=~((H>=5)&(H<=25)&(Sx>60))
    H2=np.where(mask,(H+int(deg/2))%180,H)
    S2=np.where(mask,np.clip(Sx*sat,0,255),Sx)
    out=cv2.cvtColor(np.dstack([H2,S2,V]).astype(np.uint8),cv2.COLOR_HSV2RGB)
    return Image.fromarray(np.dstack([out,arr[...,3]]),'RGBA')

SPR=[ # name, sheet, rough box, kind, anchor, label on sheet
 ('hero_front','00',(6,0,214,168),'character','bottom','BOMB MAN (FRONT 3/4)'),
 ('hero_back','00',(210,62,312,168),'character','bottom','DOWN (back view)'),
 ('hero_left','00',(328,62,424,168),'character','bottom','LEFT'),
 ('bot_robot','24',(503,288,600,405),'character','bottom','ENEMIES: robot'),
 ('bomb','00',(446,0,542,66),'bomb','bottom','BOMB'),
 ('bomb_remote','00',(592,0,702,66),'bomb','bottom','REMOTE BOMB'),
 ('fx_center','00',(434,86,533,173),'fx','center','EXPLOSION CENTER'),
 ('fx_segment','00',(527,96,641,172),'fx','center','FLAME SEGMENT'),
 ('fx_end','00',(635,84,720,173),'fx','center','FLAME END'),
 ('fx_dust','24',(298,278,362,358),'fx','center','DUST SKID'),
 ('pu_bomb','00',(34,221,125,298),'powerup','center','BOMB UP'),
 ('pu_fire','00',(119,221,211,298),'powerup','center','FIRE RANGE UP'),
 ('pu_remote','00',(205,221,295,298),'powerup','center','REMOTE DETONATE'),
 ('pu_speed','00',(289,221,381,298),'powerup','center','SPEED UP'),
 ('pu_kick','00',(403,221,495,298),'powerup','center','KICK'),
 ('pu_punch','00',(489,221,583,298),'powerup','center','PUNCH'),
 ('pu_carry','24',(662,97,715,157),'powerup','center','CARRY'),
 ('pu_shield','24',(601,185,659,244),'powerup','center','SHIELD'),
 ('ic_fire','00',(388,362,426,405),'icon','center','UI SAMPLE flame'),
 ('ic_timer','21',(381,9,409,40),'icon','center','arena HUD stopwatch'),
]
cut=[]
for name,sh,box,kind,anchor,label in SPR:
    img=cutout(sh,box, keep_ratio=0.02 if kind=='fx' else 0.15)
    if name=='hero_left':  # the grey pointer of the RIGHT label above touches the hat: drop low-saturation pixels in the top band
        a=np.array(img); hsv=cv2.cvtColor(a[...,:3],cv2.COLOR_RGB2HSV); band=int(a.shape[0]*0.16)
        grey=(hsv[:band,:,1]<70)&(hsv[:band,:,2]>45); a[:band,:,3][grey]=0
        img=Image.fromarray(a,'RGBA'); img=img.crop(img.getbbox())
    size=96 if kind=='icon' else CH if kind=='character' else G
    c,s=fit(img,anchor,pad=6 if kind=='icon' else 10 if size==G else 14,size=size)
    src=f'{sh}_x4.webp {tuple(v*4 for v in box)} (Real-ESRGAN 4x of {sh}.jpeg {box})' if sh in X4 else f'{sh}.jpeg {box}'
    save(name,c,kind,src, 'cut', anchor, label=label, upscale=round(s,2))
    cut.append(name)

# ---- derived sprites
hl=Image.open(OUT+'hero_left.webp'); save('hero_right',ImageOps.mirror(hl),'character','hero_left','derived: mirrored','bottom')
for dname,deg,sat in [('p2',-100,1.0),('p3',140,1.1),('p4',60,1.05)]:
    for d in ['front','back','left','right']:
        save(f'{dname}_{d}',hue_shift(Image.open(OUT+f'hero_{d}.webp'),deg,sat),'character',f'hero_{d}',f'derived: hue +{deg}° outfit recolour','bottom')
save('bot_robot_blue',hue_shift(Image.open(OUT+'bot_robot.webp'),-120,1.1,protect_skin=False),'character','bot_robot','derived: hue shift (remote bot)','bottom')
# held-bomb / portrait
hf=Image.open(OUT+'hero_front.webp'); bb=hf.getbbox()
head=hf.crop((bb[0]+int((bb[2]-bb[0])*0.18),bb[1],bb[0]+int((bb[2]-bb[0])*0.78),bb[1]+int((bb[3]-bb[1])*0.52)))
hc,_=fit(head,'center',pad=4,size=96); save('ic_hero',hc,'icon','hero_front','derived: head crop')
# line-bomb powerup: recoloured Bomb Up frame, icon area refilled, three bombs in a row
pb=Image.open(OUT+'pu_bomb.webp'); frame=hue_shift(pb,120,1.1,protect_skin=False)
bbx=frame.getbbox(); W_=bbx[2]-bbx[0]; H_=bbx[3]-bbx[1]
ix0,iy0,ix1,iy1=bbx[0]+int(W_*.115),bbx[1]+int(H_*.11),bbx[2]-int(W_*.115),bbx[3]-int(H_*.13)
fa=np.array(frame).astype(np.float32)
top=fa[iy0+2:iy0+6,ix0+4:ix1-4,:3].reshape(-1,3).mean(0); bot=top*0.62
from PIL import ImageDraw
grad=np.zeros((iy1-iy0,ix1-ix0,4),np.uint8)
for r in range(iy1-iy0):
    t=r/max(1,iy1-iy0-1); grad[r,:,:3]=(top*(1-t)+bot*t).astype(np.uint8); grad[r,:,3]=255
g=Image.fromarray(grad,'RGBA'); m=Image.new('L',g.size,0); ImageDraw.Draw(m).rounded_rectangle((0,0,g.width-1,g.height-1),radius=int(W_*.12),fill=255)
fr=frame.copy(); fr.paste(g,(ix0,iy0),m)
bomb=Image.open(OUT+'bomb.webp'); bomb=bomb.crop(bomb.getbbox())
bw=int((ix1-ix0)*0.44); bh=int(bomb.height*bw/bomb.width); bs=bomb.resize((bw,bh),Image.LANCZOS)
cx=(ix0+ix1)//2; cy=(iy0+iy1)//2
for i,(ox,oy) in enumerate([(-0.62,0.10),(0.62,0.10),(0,-0.05)]):
    fr.alpha_composite(bs,(int(cx+ox*bw-bw/2), int(cy+oy*bh-bh/2)))
save('pu_line',fr,'powerup','pu_bomb + bomb','derived: recoloured Bomb Up frame with three bombs')

# ---- tile textures (square opaque faces from the 3D environment kit)
KIT=[('tex_stone',(15,160,65,212)),('tex_metal',(71,161,114,185)),('tex_metal_side',(71,187,114,212)),('tex_crate',(126,161,171,185)),('tex_crate_side',(126,187,171,212)),
     ('tex_ice',(181,159,224,212)),('tex_lava',(233,159,276,212)),('tex_conveyor',(286,160,330,211)),('tex_bush',(337,160,385,204))]
for name,(x0,y0,x1,y1) in KIT:
    f=X4['24'][y0*4:y1*4,x0*4:x1*4] if '24' in X4 else S['24'][y0:y1,x0:x1]; t=cv2.resize(f,(G,G),interpolation=cv2.INTER_CUBIC if f.shape[0]<G else cv2.INTER_AREA)
    T=Image.fromarray(t).filter(ImageFilter.UnsharpMask(radius=2,percent=60,threshold=2))
    T.save(OUT+name+'.webp','WEBP',quality=82,method=6)
    face='top face (unforeshortened)' if (y1-y0)<30 else 'front face'
    manifest[name]={'file':name+'.webp','kind':'tile','source':f'24.jpeg {(x0,y0,x1,y1)}','how':f'cut: {face} of 3D ENVIRONMENT KIT cube','label':name[4:].upper()}
    cut.append(name)
ice=Image.open(OUT+'tex_ice.webp').convert('RGB')
water=ImageEnhance.Brightness(hue_shift(ice.convert('RGBA'),16,1.25,protect_skin=False).convert('RGB')).enhance(0.72).filter(ImageFilter.GaussianBlur(1.2))
water.save(OUT+'tex_water.webp','WEBP',quality=82,method=6); manifest['tex_water']={'file':'tex_water.webp','kind':'tile','source':'tex_ice','how':'derived: deeper hue + blur'}

# ---- arena backdrops + menu thumbnails (opaque)
def grade(img, mul, add=(0,0,0), sat=1.0):
    a=np.array(img).astype(np.float32); g=a.mean(2,keepdims=True); a=g+(a-g)*sat
    a=a*np.array(mul)+np.array(add); return Image.fromarray(np.clip(a,0,255).astype(np.uint8))
f21=Image.fromarray(S['21']); f22=Image.fromarray(S['22']); f23=Image.fromarray(S['23'])
thumbs={'factory':f21,'temple':f22,'ice':grade(f21,(0.75,1.0,1.35),(10,30,55),0.55),'lava':grade(f21,(1.35,0.72,0.5),(25,0,0),1.15)}
for k,v in thumbs.items():
    if k in('ice','lava'):
        v.save(OUT+f'map_{k}.webp','WEBP',quality=78,method=6)
        manifest[f'map_{k}']={'file':f'map_{k}.webp','kind':'map-thumb','source':'21.jpeg (Factory arena art)','how':'derived: colour graded'}
backs={'factory':f21,'temple':f23,'ice':thumbs['ice'],'lava':thumbs['lava']}
for k,v in backs.items():
    b=ImageEnhance.Brightness(v.resize((480,270),Image.LANCZOS).filter(ImageFilter.GaussianBlur(5))).enhance(0.55)
    b.save(OUT+f'bg_{k}.webp','WEBP',quality=70,method=6)
    manifest[f'bg_{k}']={'file':f'bg_{k}.webp','kind':'backdrop','source':{'factory':'21','temple':'23','ice':'21 graded','lava':'21 graded'}[k]+'.jpeg','how':'derived: blurred + dimmed arena art'}
# ---- menu key art: Factory arena render + the cut hero, robot and a lit bomb (replaces the raw sprite sheet in the menu)
def key_art():
    W,H=720,400; bg=Image.fromarray(S['21']).convert('RGB'); r=max(W/bg.width,H/bg.height)
    bg=bg.resize((int(bg.width*r)+1,int(bg.height*r)+1),Image.LANCZOS); bg=bg.resize((int(bg.width*1.18),int(bg.height*1.18)),Image.LANCZOS); bg=bg.crop(((bg.width-W)//2,bg.height-H,(bg.width-W)//2+W,bg.height))
    bg=ImageEnhance.Brightness(bg.filter(ImageFilter.GaussianBlur(2.2))).enhance(0.62).convert('RGBA')
    yy,xx=np.mgrid[0:H,0:W]; v=np.clip(((xx-W*.36)/W)**2*1.6+((yy-H*.55)/H)**2*1.4,0,1); shade=Image.fromarray((v*200).astype(np.uint8),'L')
    bg.alpha_composite(Image.merge('RGBA',[Image.new('L',(W,H),0)]*3+[shade]))
    def put(name,h,cx,bottom,glow=None):
        im=Image.open(OUT+name+'.webp').convert('RGBA'); im=im.crop(im.getbbox()); k=h/im.height; im=im.resize((int(im.width*k),h),Image.LANCZOS)
        sh=Image.new('RGBA',(int(im.width*1.0),int(h*.16)),(0,0,0,0)); from PIL import ImageDraw as D; D.Draw(sh).ellipse((0,0,sh.width-1,sh.height-1),fill=(0,0,0,120)); sh=sh.filter(ImageFilter.GaussianBlur(6))
        bg.alpha_composite(sh,(int(cx-sh.width/2),int(bottom-sh.height*.6))); bg.alpha_composite(im,(int(cx-im.width/2),int(bottom-h)))
    fx=Image.open(OUT+'fx_center.webp').convert('RGBA'); fx=fx.resize((300,300),Image.LANCZOS); a_=np.array(fx).astype(np.float32); a_[...,3]*=.55; bg.alpha_composite(Image.fromarray(a_.astype(np.uint8)),(330,80))
    put('bot_robot',180,620,380); put('bot_robot_blue',140,495,350); put('bomb',84,405,392); put('hero_front',430,195,418)
    out=bg.convert('RGB'); out.save(OUT+'bg_menu.webp','WEBP',quality=82,method=6)
    manifest['bg_menu']={'file':'bg_menu.webp','kind':'menu-art','source':'21.jpeg + hero_front, bot_robot(_blue), bomb, fx_center','how':'derived: composed key art for the menu card'}
key_art()
json.dump({'grid':G,'sprites':manifest},open(OUT+'manifest.json','w'),indent=1)
print(len(manifest),'assets;',len(cut),'cut')
