"""Crop existing PNGs to their main object; keep every original untouched.
Some supplied crops retain small fragments from neighbouring sprites.
Requires Pillow only when regenerating prepared files.
"""
from pathlib import Path
from collections import deque
from PIL import Image
import json
root=Path(__file__).resolve().parent.parent
report=[]
for folder in ['characters','items','ui','world']:
 for source in (root/folder).rglob('*.png'):
  image=Image.open(source).convert('RGBA')
  scale=min(1,260/max(image.size))
  size=(max(1,round(image.width*scale)),max(1,round(image.height*scale)))
  alpha=image.getchannel('A').resize(size)
  width,height=alpha.size
  mask=bytearray(1 if a>35 else 0 for a in alpha.getdata())
  largest=[]
  for start in range(len(mask)):
   if not mask[start]:continue
   mask[start]=0;queue=deque([start]);component=[]
   while queue:
    pos=queue.popleft();component.append(pos);x,y=pos%width,pos//width
    for nx,ny in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
     if 0<=nx<width and 0<=ny<height:
      n=ny*width+nx
      if mask[n]:mask[n]=0;queue.append(n)
   if len(component)>len(largest):largest=component
  xs=[n%width for n in largest];ys=[n//width for n in largest]
  sx,sy=image.width/width,image.height/height
  box=(max(0,int(min(xs)*sx)-5),max(0,int(min(ys)*sy)-5),min(image.width,int((max(xs)+1)*sx)+5),min(image.height,int((max(ys)+1)*sy)+5))
  cropped=image.crop(box)
  # Reduce only oversized source illustrations; never upscale.
  cropped.thumbnail((900,900),Image.Resampling.LANCZOS)
  relative=source.relative_to(root);target=root/'assets/prepared'/relative
  target.parent.mkdir(parents=True,exist_ok=True);cropped.save(target,optimize=True)
  report.append({'source':str(relative),'output':str(target.relative_to(root)),'crop':box,'size':cropped.size})
(root/'assets/prepared/manifest.json').write_text(json.dumps(report,indent=2))
print(f'Prepared {len(report)} supplied PNGs; originals preserved.')
