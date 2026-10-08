"""Prepare supplied v2 art locally; feet anchors are visual metadata, never hitboxes."""
from pathlib import Path
from PIL import Image
import json, hashlib
ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path('/Users/michalsobczynski/Downloads/wika_michal_fixpack_v2/assets')
report=[]; anchors={}
def anchor(im):
    a=im.getchannel('A'); bounds=a.point(lambda n:255 if n>64 else 0).getbbox(); l,t,r,b=bounds
    rows=max(3,round((b-t)*.035)); total=weighted=0
    for y in range(b-rows,b):
        for x in range(l,r):
            alpha=a.getpixel((x,y))
            if alpha>64: total+=alpha;weighted+=(x+.5)*alpha
    return {'x':round((weighted/total)/im.width,5),'y':round(b/im.height,5)}
for pose in ['idle','walk','jump','push']:
    src=SOURCE/'wika'/f'wika_{pose}.png';im=Image.open(src).convert('RGBA')
    bounds=im.getchannel('A').point(lambda n:255 if n>16 else 0).getbbox()
    l,t,r,b=bounds;crop=(max(0,l-4),max(0,t-4),min(im.width,r+4),min(im.height,b+4));im=im.crop(crop);im.thumbnail((300,320),Image.Resampling.LANCZOS)
    dest=ROOT/'assets/duo/v2/wika'/f'wika_{pose}.webp';dest.parent.mkdir(parents=True,exist_ok=True);im.save(dest,'WEBP',quality=90,method=6)
    key='duoWika'+pose.title();anchors[key]=anchor(im)
    report.append({'source':str(src),'file':str(dest.relative_to(ROOT)),'crop':crop,'size':list(im.size),'anchor':anchors[key],'sourceSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'bytes':dest.stat().st_size})
for pose in ['idle','walk','jump','push']:
    src=ROOT/'assets/duo/characters/michal'/f'michal_{pose}.webp';anchors['duoMichal'+pose.title()]=anchor(Image.open(src).convert('RGBA'))
src=SOURCE/'cover/wika_michal_cover.png';im=Image.open(src).convert('RGB');im.thumbnail((1000,750),Image.Resampling.LANCZOS);dest=ROOT/'assets/duo/v2/cover.webp';im.save(dest,'WEBP',quality=91,method=6)
report.append({'source':str(src),'file':str(dest.relative_to(ROOT)),'size':list(im.size),'sourceSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'bytes':dest.stat().st_size})
(ROOT/'assets/duo/v2/manifest.json').write_text(json.dumps(report,indent=2)+'\n')
(ROOT/'js/games/duo-sprite-config.js').write_text('// Generated visual foot anchors. Physics uses fixed logical rectangles.\nexport const DUO_SPRITES = '+json.dumps(anchors,indent=2)+';\nexport const DUO_SPRITE_HEIGHT = 132;\n')
print('5 supplied v2 assets:',sum(r['bytes'] for r in report),'bytes')
