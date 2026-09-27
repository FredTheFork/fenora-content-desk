import os, sys
from concurrent.futures import ProcessPoolExecutor
from PIL import Image
SRC='render/out'; DST='render/jpg'
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
