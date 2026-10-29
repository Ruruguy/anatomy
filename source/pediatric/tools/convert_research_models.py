# SPDX-License-Identifier: GPL-3.0-or-later
# Data and derived meshes retain their own licenses and PIPER additional terms.
from pathlib import Path
import numpy as np,struct,json,hashlib
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
