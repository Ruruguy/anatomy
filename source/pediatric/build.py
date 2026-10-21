from pathlib import Path
import base64,json,re
root=Path(__file__).resolve().parent
imports={}
for name,file in [('display-material','display-material.js'),('model-import','model-import.js'),('stl','vendor/STLLoader.js'),('three','vendor/three.module.js'),('three/core','vendor/three.core.js'),('orbit','vendor/OrbitControls.js'),('content','content.js'),('gltf','vendor/GLTFLoader.js'),('geometry-utils','vendor/BufferGeometryUtils.js')]:
    source=(root/file).read_text().replace("'./three.core.js'","'three/core'").replace("'../utils/BufferGeometryUtils.js'","'geometry-utils'")
    imports[name]='data:text/javascript;base64,'+base64.b64encode(source.encode()).decode()
asset='data:model/gltf-binary;base64,'+base64.b64encode((root/'models/nih-3169-skull.glb').read_bytes()).decode()
html=(root/'template.html').read_text().replace('__CSS__',(root/'style.css').read_text()).replace('__IMPORTS__','<script type="importmap">'+json.dumps({'imports':imports},ensure_ascii=False)+'</script>').replace('__APP__',(root/'app.js').read_text().replace('__SKULL_ASSET__',asset))
html+='\n<!-- MODEL ATTRIBUTION: Baby cranium by nevitdilmen (Nevit Dilmen), NIH 3D 3DPX-003169 v2, https://3d.nih.gov/entries/3DPX-003169?version=2 ; CC BY-SA 4.0 https://creativecommons.org/licenses/by-sa/4.0/ ; Original GLB preserved; display rotated, centered, uniformly scaled, recolored. -->\n'
html+='\n<!-- Three.js r180 license\n'+(root/'vendor/THREE-LICENSE.txt').read_text()+'\n-->\n'
(root/'index.html').write_text(html)
out=root/'兒童嬰兒解剖教室_雙擊開啟.html'
out.write_text(html)
print(f'Built {out} ({len(html.encode())/1024/1024:.2f} MiB)')
