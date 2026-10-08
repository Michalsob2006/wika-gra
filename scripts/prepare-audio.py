"""Offline macOS SFX preparation: system afconvert + Python standard library."""
from pathlib import Path
import subprocess, tempfile, wave, array, sys, json, math, hashlib
ROOT = Path(__file__).resolve().parents[1]
CHOICES = {
 'collect-heart': ('Tink', .56), 'collect-bonus': ('Glass', .95),
 'negative': ('Basso', .65), 'danger': ('Submarine', .95),
 'game-over': ('Sosumi', 1.15), 'win': ('Hero', 1.05), 'click': ('Pop', .16),
}
report=[]
with tempfile.TemporaryDirectory(prefix='wiki-audio-') as tmp:
 for name,(original,limit) in CHOICES.items():
  source=Path('/System/Library/Sounds')/(original+'.aiff')
  copied=Path(tmp)/(original+'.aiff')
  # Copy before conversion; delivered assets are self-contained WAV copies.
  import shutil
  shutil.copyfile(source,copied)
  raw=Path(tmp)/(name+'.wav')
  subprocess.run(['/usr/bin/afconvert','-f','WAVE','-d','LEI16@22050','-c','1',str(copied),str(raw)],check=True)
  with wave.open(str(raw)) as w:
   rate=w.getframerate();samples=array.array('h',w.readframes(w.getnframes()))
  if sys.byteorder!='little': samples.byteswap()
  # Remove inaudible leading/trailing padding, retain a little attack padding.
  audible=[i for i,s in enumerate(samples) if abs(s)>100]
  first=max(0,audible[0]-int(rate*.004)) if audible else 0
  end=min(len(samples),audible[-1]+int(rate*.04)) if audible else len(samples)
  samples=samples[first:min(end,first+round(rate*limit))]
  peak=max(abs(x) for x in samples);gain=0.8*32767/peak if peak else 1
  fade=min(round(rate*.025),len(samples)//4)
  for i in range(len(samples)):
   factor=min(1,i/max(1,round(rate*.001)),(len(samples)-1-i)/max(1,fade))
   samples[i]=round(samples[i]*gain*factor)
  destination=ROOT/'assets/audio/sfx'/(name+'.wav')
  data=samples.tobytes() if sys.byteorder=='little' else array.array('h',samples)
  if sys.byteorder!='little': data.byteswap();data=data.tobytes()
  with wave.open(str(destination),'wb') as w:
   w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(data)
  report.append({'effect':name,'source':str(source),'file':str(destination.relative_to(ROOT)), 'durationSeconds':round(len(samples)/rate,4),'bytes':destination.stat().st_size,'sampleRate':rate,'channels':1,'peak':round(max(abs(x) for x in samples)/32768,4),'sha256':hashlib.sha256(destination.read_bytes()).hexdigest()})
(ROOT/'assets/audio/sfx/manifest.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2));print('Total bytes:',sum(r['bytes'] for r in report))
