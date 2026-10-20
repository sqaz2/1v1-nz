import json,sys
from PIL import Image,ImageDraw
m=json.load(open('out/manifest.json'))['sprites']
names=[n for n in m if m[n]['kind'] not in('backdrop','map-thumb')]
cols=8; cell=130
H=((len(names)+cols-1)//cols)*(cell+14)
sheet=Image.new('RGB',(cols*cell,H),(255,0,255))
d=ImageDraw.Draw(sheet)
for i,n in enumerate(names):
    im=Image.open('out/'+m[n]['file']).convert('RGBA').resize((cell-6,cell-6))
    x=(i%cols)*cell; y=(i//cols)*(cell+14)
    # checker
    bg=Image.new('RGBA',im.size,(40,140,60,255)); bg.alpha_composite(im); sheet.paste(bg.convert('RGB'),(x+3,y+3))
    d.text((x+3,y+cell-2),n,fill=(255,255,255))
sheet.save(sys.argv[1] if len(sys.argv)>1 else 'contact.png')
