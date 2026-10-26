# SPDX-License-Identifier: GPL-3.0-or-later
# Data and derived meshes retain their own licenses and PIPER additional terms.
from pathlib import Path
import numpy as np,re,struct,json,zipfile,gzip,hashlib,collections
base=Path(__import__('sys').argv[1]);out=base/'converted';out.mkdir(exist_ok=True)
def write_glb(path,parts,extras):
 binary=bytearray();views=[];accessors=[];meshes=[];nodes=[];materials=[]
 def add(array,kind):
  while len(binary)%4:binary.append(0)
  offset=len(binary);b=array.tobytes();binary.extend(b);views.append({'buffer':0,'byteOffset':offset,'byteLength':len(b),'target':34962 if kind=='VEC3'else 34963})
  a={'bufferView':len(views)-1,'componentType':5126 if kind=='VEC3'else 5125,'count':len(array),'type':kind}
  if kind=='VEC3':a.update(min=array.min(axis=0).astype(float).tolist(),max=array.max(axis=0).astype(float).tolist())
  accessors.append(a);return len(accessors)-1
 for name,points,faces,color in parts:
  points=np.asarray(points,dtype='<f4');faces=np.asarray(faces,dtype='<u4');assert np.isfinite(points).all();assert faces.max()<len(points)
  pa=add(points,'VEC3');ia=add(faces.reshape(-1),'SCALAR');mat=len(materials);materials.append({'name':name,'doubleSided':True,'pbrMetallicRoughness':{'baseColorFactor':color+[1],'metallicFactor':0,'roughnessFactor':.75}})
  meshes.append({'name':name,'primitives':[{'attributes':{'POSITION':pa},'indices':ia,'material':mat}]});nodes.append({'name':name,'mesh':len(meshes)-1})
 while len(binary)%4:binary.append(0)
 doc={'asset':{'version':'2.0','generator':'Anatomy research-surface converter; no positional smoothing'},'extras':extras,'buffers':[{'byteLength':len(binary)}],'bufferViews':views,'accessors':accessors,'materials':materials,'meshes':meshes,'nodes':nodes,'scenes':[{'nodes':list(range(len(nodes)))}],'scene':0}
 j=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode();j+=b' '*((-len(j))%4);total=12+8+len(j)+8+len(binary);path.write_bytes(struct.pack('<III',0x46546c67,2,total)+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(binary),0x004e4942)+binary)
 return {'file':path.name,'bytes':total,'meshes':len(parts),'vertices':sum(len(x[1])for x in parts),'triangles':sum(len(x[2])for x in parts),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
def brain(month):
 parts=[];sources=[]
 with zipfile.ZipFile(base/f'IBA-{month:02d}Months.zip')as z:
  for hemi,label in [('lh','左大腦半球・皮質軟膜表面'),('rh','右大腦半球・皮質軟膜表面')]:
   name=f'{month:02d}Months/IBA_{month:02d}Months_{hemi}.pial.vtk';data=z.read(name);text=data.decode();m=re.search(r'POINTS\s+(\d+)\s+float\s*\n',text);n=int(m[1]);points=np.fromstring(text[m.end():],sep=' ',count=n*3,dtype=np.float32).reshape(-1,3)
   m=re.search(r'POLYGONS\s+(\d+)\s+(\d+)\s*\n',text);nf=int(m[1]);faces=np.fromstring(text[m.end():],sep=' ',count=int(m[2]),dtype=np.int32).reshape(-1,4);assert len(faces)==nf and(faces[:,0]==3).all();faces=faces[:,1:]
   # RAS-like atlas axes to a Y-up viewer via rigid rotation only; preserve distances and folds.
   points=points[:,[0,2,1]]*np.array([1,1,-1],np.float32)
   parts.append((label,points,faces,[.76,.67,.63]));source=out/f'iba-{month:02d}-{hemi}.pial.vtk.gz'
   with gzip.open(source,'wb')as f:f.write(data)
   sources.append({'original':name,'sha256':hashlib.sha256(data).hexdigest(),'preservedAs':source.name})
 report=write_glb(out/f'iba-{month:02d}months-pial.glb',parts,{'source':'https://zenodo.org/records/7044932','ageMonths':month,'license':'CC-BY-NC-SA-4.0','scope':'Two cerebral pial surfaces only; research group atlas, not individual anatomy. No cerebellum, brainstem, ventricles or per-region labels.'});report['sources']=sources;return report
if __name__=='__main__':
 reports=[]
 for month in [6,60]:
  if zipfile.is_zipfile(base/f'IBA-{month:02d}Months.zip'):reports.append(brain(month))
 (out/'conversion-report.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2));print(json.dumps(reports,ensure_ascii=False,indent=2))
