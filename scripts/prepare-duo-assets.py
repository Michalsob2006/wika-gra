"""Optimize each supplied standalone PNG, never read reference screenshots."""
from pathlib import Path
from PIL import Image
import json, hashlib
SOURCE = Path('/Users/michalsobczynski/Downloads/wika_michal_codex_pack_final')
ROOT = Path(__file__).resolve().parents[1]
report=[]
for source in sorted(SOURCE.rglob('*.png')):
    rel=source.relative_to(SOURCE)
    if rel.parts[0]=='references': continue
    im=Image.open(source).convert('RGBA')
    bounds=None
    if rel.parts[0]!='backgrounds':
        bounds=im.getchannel('A').point(lambda x:255 if x>20 else 0).getbbox()
        if bounds:
            l,t,r,b=bounds; bounds=(max(0,l-4),max(0,t-4),min(im.width,r+4),min(im.height,b+4)); im=im.crop(bounds)
    size=(1440,810) if rel.parts[0]=='backgrounds' else (280,320) if rel.parts[0]=='characters' else (640,420)
    im.thumbnail(size,Image.Resampling.LANCZOS)
    dest=ROOT/'assets/duo'/rel.with_suffix('.webp'); dest.parent.mkdir(parents=True,exist_ok=True)
    im.save(dest,'WEBP',quality=88,method=6)
    report.append({'source':str(source),'file':str(dest.relative_to(ROOT)),'crop':bounds,'size':list(im.size),'bytes':dest.stat().st_size,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest()})
(ROOT/'assets/duo/manifest.json').write_text(json.dumps(report,indent=2)+'\n')
print(f'{len(report)} separate assets: {sum(x["bytes"] for x in report):,} bytes')
