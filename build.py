"""Build the one-file offline classroom from retained adult and pediatric projects."""
from pathlib import Path
import subprocess,sys,json,hashlib
root=Path(__file__).resolve().parent
cache=root/'.build';cache.mkdir(exist_ok=True)
subprocess.run([sys.executable,str(root/'source/adult/scripts/build-standalone.py'),str(cache/'adult.html')],check=True)
subprocess.run([sys.executable,str(root/'source/pediatric/build.py')],check=True)
originals={'adult':(cache/'adult.html').read_text(),'pediatric':(root/'source/pediatric/index.html').read_text()}
bridge='<script>'+ (root/'site/bridge.js').read_text()+'</script>'
layout='<style id="classroom-layout">'+(root/'site/classroom-layout.css').read_text()+'</style>'
payload={name:html.replace('<head>','<head>'+bridge,1).replace('</head>',layout+'</head>',1) for name,html in originals.items()}
encoded=json.dumps(payload,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
html=(root/'site/template.html').read_text().replace('__PAYLOAD__',encoded).replace('__SHELL__',(root/'site/shell.js').read_text())
out=root/'人體解剖教室_雙擊開啟.html';out.write_text(html)
(root/'index.html').write_text('<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=人體解剖教室_雙擊開啟.html"><title>人體解剖教室</title><a href="人體解剖教室_雙擊開啟.html">開啟成人・兒童・嬰兒解剖教室</a></html>')
report={'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'embeddedOriginals':{k:hashlib.sha256(v.encode()).hexdigest() for k,v in originals.items()},'offline':True}
(root/'validation/build-result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(f'Unified classroom: {out} ({out.stat().st_size/1024/1024:.1f} MiB)')
