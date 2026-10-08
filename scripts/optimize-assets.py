"""Resize existing prepared PNGs for their real UI/game sizes; retain originals."""
from pathlib import Path
from PIL import Image
import re,json
root=Path(__file__).resolve().parent.parent
report=[]
# Approximate largest CSS/canvas boxes in this application, including loading/finale.
render={'wikaIdle':(100,180),'wikaRun':(68,120),'wikaJump':(80,110),'wikaHappy':(120,180),'wikaWave':(100,205),'michalIdle':(46,66),'michalBouquet':(100,205),'michalWave':(90,155),'heart':(105,105),'bigHeart':(105,85),'broken':(48,48),'gift':(140,140),'bouquet':(105,105),'letter':(110,110),'coffee':(110,110),'ticket':(110,110),'star':(110,110),'key':(110,110),'hedge':(96,22),'hedgeVertical':(22,96),'gate':(105,105),'platform':(740,42),'crate':(43,43),'flag':(55,115),'cloud':(155,65),'village':(720,110),'arch':(130,130),'left':(48,46),'right':(48,46),'jump':(48,46)}
for key,path in re.findall(r'(\w+): "([^"]+\.png)"',(root/'js/assetConfig.js').read_text()):
 source=root/'assets/prepared'/path
 im=Image.open(source).convert('RGBA')
 if key=='village':
  source=root/path
  im=Image.open(source).convert('RGBA').crop((0,38,1270,285))
 if key=='broken':
  # Broken hearts have two disconnected halves; keep both from the original.
  source=root/path
  im=Image.open(source).convert('RGBA').crop((35,48,462,380))
 maxsize=(384,384) if path.startswith('characters/') else (128,128) if '/hearts/' in path else (512,192) if key=='platform' else (256,256) if path.startswith('ui/') or key in ['crate','flag','hedge','hedgeVertical'] else (512,512) if path.startswith('world/decor/') else (192,192)
 if path.startswith('characters/'):maxsize=(384,384)
 before=im.size;im.thumbnail(maxsize,Image.Resampling.LANCZOS)
 output=root/'assets/optimized'/Path(path).with_suffix('.webp');output.parent.mkdir(parents=True,exist_ok=True)
 temporary=output.with_suffix('.tmp')
 im.save(temporary,'WEBP',quality=88,method=6)
 temporary.replace(output)
 report.append({'key':key,'source':str(source.relative_to(root)),'original_dimensions':before,'source_bytes':source.stat().st_size,'render_box':render[key],'output':str(output.relative_to(root)),'optimized_dimensions':im.size,'optimized_bytes':output.stat().st_size})
# Static loading and brand image use the same optimized assets, including a small favicon.
small=Image.open(root/'assets/prepared/items/hearts/heart_small.png').convert('RGBA');small.thumbnail((64,64));small.save(root/'assets/optimized/heart-small.tmp','WEBP',quality=90)
(root/'assets/optimized/heart-small.tmp').replace(root/'assets/optimized/heart-small.webp')
(root/'assets/optimized/manifest.json').write_text(json.dumps(report,indent=2))
a=sum(r['source_bytes'] for r in report);b=sum(r['optimized_bytes'] for r in report)
print(f'{len(report)} images: {a:,} -> {b:,} bytes ({(1-b/a)*100:.1f}% smaller)')
