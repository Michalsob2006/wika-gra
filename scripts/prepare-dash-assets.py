"""Create optimized local WebP copies; preserve source artwork and transparency."""
from pathlib import Path
from PIL import Image
import json, hashlib
SOURCE=Path('/Users/michalsobczynski/Downloads/wika_codex_final_pack')
ROOT=Path(__file__).resolve().parents[1]
report=[]
for f in sorted(SOURCE.rglob('*.png')):
 if f.parent.name=='reference': continue
 im=Image.open(f).convert('RGBA' if Image.open(f).mode=='RGBA' else 'RGB')
 bounds=None
 if im.mode=='RGBA':
  # These supplied sprites include large nearly transparent margins.
  bounds=im.getchannel('A').point(lambda n:255 if n>16 else 0).getbbox()
  if bounds:
   l,t,r,b=bounds;bounds=(max(0,l-4),max(0,t-4),min(im.width,r+4),min(im.height,b+4));im=im.crop(bounds)
 category=f.parent.name
 size={'covers':(720,540),'backgrounds':(1440,480),'characters':(360,360),'tiles':(960,200),'obstacles':(240,240),'items':(128,128),'ui':(160,160)}[category]
 im.thumbnail(size,Image.Resampling.LANCZOS)
 dest=ROOT/'assets/dash'/f.relative_to(SOURCE).with_suffix('.webp');dest.parent.mkdir(parents=True,exist_ok=True)
 im.save(dest,'WEBP',quality=86 if category in ['covers','backgrounds'] else 90,method=6)
 report.append({'source':str(f),'file':str(dest.relative_to(ROOT)),'size':list(im.size),'crop':bounds,'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
(ROOT/'assets/dash/manifest.json').write_text(json.dumps(report,indent=2)+'\n')
print(len(report),'WebP,',sum(i['bytes'] for i in report),'bytes')
