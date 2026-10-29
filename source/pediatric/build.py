from pathlib import Path
import base64,json,re,sys,shutil,hashlib
web_output=Path(sys.argv[sys.argv.index('--web-output')+1]) if '--web-output' in sys.argv else None
root=Path(__file__).resolve().parent
imports={}
for name,file in [('research-catalog','research-models.js'),('medical-rendering','../../site/rendering-profile.js'),('display-material','display-material.js'),('model-import','model-import.js'),('stl','vendor/STLLoader.js'),('three','vendor/three.module.js'),('three/core','vendor/three.core.js'),('orbit','vendor/OrbitControls.js'),('content','content.js'),('gltf','vendor/GLTFLoader.js'),('geometry-utils','vendor/BufferGeometryUtils.js')]:
    source=(root/file).read_text().replace("'./three.core.js'","'three/core'").replace("'../utils/BufferGeometryUtils.js'","'geometry-utils'")
    imports[name]='data:text/javascript;base64,'+base64.b64encode(source.encode()).decode()
skull=root/'models/nih-3169-skull.glb'
if web_output:
    target=web_output.parent/'models'/skull.name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(skull,target)
    asset='./models/'+skull.name+'?v='+hashlib.sha256(skull.read_bytes()).hexdigest()[:12]
else:
    asset='data:model/gltf-binary;base64,'+base64.b64encode(skull.read_bytes()).decode()
catalog=json.JSONDecoder().raw_decode((root/'research-models.js').read_text().split('=',1)[1].lstrip())[0]
research_assets={}
if web_output:
    model_dir=web_output.parent/'models'
    allowed={skull.name}|{model['file'] for model in catalog}
    for obsolete in model_dir.glob('*.glb'):
        if obsolete.name not in allowed:obsolete.unlink()
for model in catalog:
    file=root/'models'/model['file']
    if web_output:
        target=web_output.parent/'models'/file.name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(file,target)
        research_assets[model['id']]='./models/'+file.name+'?v='+hashlib.sha256(file.read_bytes()).hexdigest()[:12]
    else:
        research_assets[model['id']]='data:model/gltf-binary;base64,'+base64.b64encode(file.read_bytes()).decode()
html=(root/'template.html').read_text().replace('__CSS__',(root/'style.css').read_text()).replace('__IMPORTS__','<script type="importmap">'+json.dumps({'imports':imports},ensure_ascii=False)+'</script>').replace('__APP__',(root/'app.js').read_text().replace('__SKULL_ASSET__',asset).replace('__RESEARCH_ASSETS__',json.dumps(research_assets,separators=(',',':'))))
html+='\n<!-- MODEL ATTRIBUTION: Baby cranium by nevitdilmen (Nevit Dilmen), NIH 3D 3DPX-003169 v2, https://3d.nih.gov/entries/3DPX-003169?version=2 ; CC BY-SA 4.0 https://creativecommons.org/licenses/by-sa/4.0/ ; Original GLB preserved; display rotated, centered, uniformly scaled, recolored. -->\n'
html+='\n<!-- Three.js r180 license\n'+(root/'vendor/THREE-LICENSE.txt').read_text()+'\n-->\n'
if web_output:
    out=web_output;out.parent.mkdir(parents=True,exist_ok=True);out.write_text(html)
else:
    (root/'index.html').write_text(html)
    out=root/'兒童嬰兒解剖教室_雙擊開啟.html';out.write_text(html)
print(f'Built {out} ({len(html.encode())/1024/1024:.2f} MiB)')
