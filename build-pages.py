"""Create GitHub Pages assets without uploading local history or user files."""
from pathlib import Path
import json,subprocess,sys,shutil,re,hashlib
root=Path(__file__).resolve().parent
out=root/'docs';out.mkdir(exist_ok=True)
# The adult compiled site contains its own relative model/decoder URLs.
shutil.copytree(root/'source/adult/docs',out/'adult',dirs_exist_ok=True)
subprocess.run([sys.executable,str(root/'source/pediatric/build.py')],check=True)
(out/'pediatric').mkdir(exist_ok=True)
bridge='<script>'+(root/'site/bridge.js').read_text()+'</script>'
layout='<style id="classroom-layout">'+(root/'site/classroom-layout.css').read_text()+'</style>'
for name,source in [('adult',root/'source/adult/docs/index.html'),('pediatric',root/'source/pediatric/index.html')]:
 html=source.read_text().replace('<head>','<head>'+bridge,1).replace('</head>',layout+'</head>',1)
 if name=='adult':
  for asset in ['assets/app.js','assets/style.css']:
   version=hashlib.sha256((out/name/asset).read_bytes()).hexdigest()[:12]
   html=html.replace('./'+asset,'./'+asset+'?v='+version)
 (out/name/'index.html').write_text(html)
payload={name:{'src':'./'+name+'/index.html'} for name in ['adult','pediatric']}
html=(root/'site/template.html').read_text().replace('__PAYLOAD__',json.dumps(payload)).replace('__SHELL__',(root/'site/shell.js').read_text())
html=html.replace('● 本機離線 · 無需登入','● 免費教學 · 無需登入').replace('此 HTML 已內嵌兩個教室，可單獨複製到其他電腦。','這是線上版，選擇教室時才載入對應模型。')
html=html.replace('模型來源與授權保留在各教室及專案原始資料內。','模型來源與授權保留在各教室及專案原始資料內。<a href="./ATTRIBUTION.md" target="_blank" rel="noopener">完整來源與授權</a>。')
(out/'index.html').write_text(html)
(out/'.nojekyll').touch()
(out/'ATTRIBUTION.md').write_text('# 整合版模型與教材來源\n\n'+(root/'source/adult/ATTRIBUTION.md').read_text()+'\n\n'+(root/'source/pediatric/models/ATTRIBUTION.md').read_text())
(out/'THIRD_PARTY_LICENSES.txt').write_text((root/'source/adult/THIRD_PARTY_LICENSES.txt').read_text()+'\n\n'+(root/'source/pediatric/vendor/THREE-LICENSE.txt').read_text())
files=list(f for f in out.rglob('*') if f.is_file());assert all(f.stat().st_size<25*1024*1024 for f in files)
print('Pages ready:',len(files),'files; entry', (out/'index.html').stat().st_size,'bytes')
