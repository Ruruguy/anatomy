# SPDX-License-Identifier: GPL-3.0-or-later
# Data and derived meshes retain their own licenses and PIPER additional terms.
from pathlib import Path
import re,json,collections,numpy as np,gzip,shutil
from convert_research_models import write_glb,base,out
src=base/'piper-source'
if(base/'piper-body.k').exists():shutil.copy2(base/'piper-body.k',src/'mesh_PIPER_Body.k')
nodes={};parts={};shells=collections.defaultdict(dict);solids=collections.defaultdict(dict);conflicts=[]
for f in src.glob('*.k'):
 key='';data=[];skip=False
 for line in f.read_text(encoding='latin1').splitlines():
  if not line.strip()or line.startswith('$'):continue
  if line.startswith('*'):key=line.strip().upper();data=[];skip=False;continue
  if key=='*NODE':
   nid=int(line[:8]);xyz=tuple(float(line[8+16*i:24+16*i])for i in range(3))
   if nid in nodes and max(abs(a-b)for a,b in zip(nodes[nid],xyz))>1e-5:conflicts.append(nid)
   nodes[nid]=xyz
  elif key in ['*PART','*PART_TITLE']:
   data.append(line)
   if len(data)==2:parts[int(line[:10])]=data[0].strip()
  elif key in ['*ELEMENT_SHELL','*ELEMENT_SHELL_THICKNESS','*ELEMENT_SOLID']:
   if skip:skip=False;continue
   values=[int(line[i:i+8])for i in range(0,min(len(line),80),8)if line[i:i+8].strip()];eid,pid=values[:2];verts=values[2:10 if key=='*ELEMENT_SOLID'else 6]
   target=solids if key=='*ELEMENT_SOLID'else shells
   if eid in target[pid] and target[pid][eid]!=verts:raise RuntimeError('Conflicting element '+str(eid))
   target[pid][eid]=verts
   if key=='*ELEMENT_SHELL_THICKNESS':skip=True
assert not conflicts,conflicts[:20]
print('nodes',len(nodes),'parts',len(parts),'shells',sum(map(len,shells.values())),'solids',sum(map(len,solids.values())),flush=True)
allparts=[];report=[];missing=set();omitted=[]
for pid in sorted(set(shells)|set(solids)):
 name=parts.get(pid)
 if not name:omitted.append(pid);continue
 # Display only anatomy-bearing parts. Discrete beams, measurement and controls are omitted.
 if any(t in name.lower()for t in ['dummy','sensor','acceler','belt','shoe','rigidbody','airbag']):continue
 surface={}
 def unique(v):return list(dict.fromkeys(v))
 for verts in solids[pid].values():
  if len(verts)!=8:raise RuntimeError('Unexpected solid format')
  u=unique(verts);cellcenter=np.array([nodes[n]for n in u]).mean(axis=0)
  candidates=[[u[i]for i in inds]for inds in [[0,2,1],[0,1,3],[1,2,3],[2,0,3]]]if len(u)==4 else [[verts[i]for i in inds]for inds in [[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]]]
  for v in candidates:
   face=unique(v);key=tuple(sorted(face))
   if len(face)<3:continue
   fp=np.array([nodes[n]for n in face])
   if np.dot(np.cross(fp[1]-fp[0],fp[2]-fp[0]),fp.mean(axis=0)-cellcenter)<0:face.reverse()
   if key in surface:surface[key][1]+=1
   else:surface[key]=[face,1]
 faces=[x[0]for x in surface.values()if x[1]==1]
 faces+= [unique(v)for v in shells[pid].values()if len(unique(v))>=3]
 # Deduplicate coincident faces inside each anatomical part only.
 faces=list({tuple(sorted(f)):f for f in faces}.values());used=sorted({v for face in faces for v in face})
 unknown=[v for v in used if v not in nodes]
 if unknown:missing.update(unknown);continue
 if not faces:continue
 mapping={v:i for i,v in enumerate(used)};points=np.array([nodes[v]for v in used],dtype=np.float32);center=points.mean(axis=0);tri=[]
 for face in faces:
  v=[mapping[n]for n in face];p=points[v]
  # Preserve shell winding; boundary faces were oriented against their source cell above.
  for i in range(1,len(v)-1):tri.append([v[0],v[i],v[i+1]])
 # Rigid cyclic permutation maps original Z-up to Y-up; no deformation/scaling.
 points=points[:,[1,2,0]]
 col=[.83,.79,.68] if '_BO_'in name else[.74,.47,.42] if '_MU_'in name else[.65,.52,.46]
 if 'brain'in name.lower()or 'cerebr'in name.lower():col=[.74,.66,.61]
 if 'lung'in name.lower():col=[.75,.57,.63]
 if 'skin'in name.lower()or 'flesh'in name.lower():col=[.74,.6,.49]
 allparts.append((name,points,np.array(tri,dtype=np.uint32),col));report.append({'pid':pid,'name':name,'triangles':len(tri)})
assert not missing,('Missing source nodes',len(missing),list(missing)[:10])
result=write_glb(out/'piper-6yo-pedestrian.glb',allparts,{'source':'https://gitlab.com/piper-project.org/child_pedestrian','ageYears':6,'license':'GPL-3.0-or-later with liability and Open Science clauses','scope':'Boundary visualization of finite-element anatomy, not a clinical atlas. Discrete beams and measurement elements omitted.'})
result.update(parts=report,omittedUndefinedParts=omitted)
(out/'piper-conversion.json').write_text(json.dumps(result,indent=2));print(json.dumps({k:v for k,v in result.items()if k!='parts'},indent=2));print('\n'.join(x['name']for x in report))
