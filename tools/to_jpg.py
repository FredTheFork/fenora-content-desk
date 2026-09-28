import os, sys, json
from concurrent.futures import ProcessPoolExecutor
from PIL import Image
SRC='render/png'; DST='render/jpg'
def conv(f):
    o=os.path.join(DST,f[:-4]+'.jpg')
    if os.path.exists(o): return 0
    im=Image.open(os.path.join(SRC,f)).convert('RGB')
    im.save(o,'JPEG',quality=92,optimize=True,progressive=True,subsampling=0)
    return os.path.getsize(o)
os.makedirs(DST,exist_ok=True)
fs=sorted(f for f in os.listdir(SRC) if f.endswith('.png'))
with ProcessPoolExecutor(max_workers=8) as ex:
    tot=list(ex.map(conv,fs,chunksize=4))
print(len(fs),'->',DST, round(sum(tot)/1e6,1),'MB')

# Manifest the dashboard reads to know which images exist —
# the same file the local server serves live at /render/images.json.
def listing(d, ext):
    try: return sorted(f for f in os.listdir(d) if f.endswith(ext))
    except FileNotFoundError: return []
man = {'png': listing(SRC,'.png'), 'jpg': listing(DST,'.jpg')}
with open(os.path.join('render','images.json'),'w') as f:
    json.dump(man,f)
print('render/images.json:', len(man['png']),'png ·', len(man['jpg']),'jpg')
