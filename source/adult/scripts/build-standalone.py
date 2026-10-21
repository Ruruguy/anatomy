"""Package the built Pages site into one directly openable, offline HTML."""
from pathlib import Path
import base64, json, re, sys
root = Path(__file__).resolve().parent.parent
site = root / 'docs'
out = Path(sys.argv[1]) if len(sys.argv) > 1 else root / '人體解剖教室_雙擊開啟.html'
assets = {}
for folder in ['models', 'draco']:
    for file in (site / folder).iterdir():
        if file.is_file():
            mime = 'text/javascript' if file.suffix == '.js' else 'application/octet-stream'
            assets[file.name] = f'data:{mime};base64,' + base64.b64encode(file.read_bytes()).decode()
html = (site / 'index.html').read_text()
css = (site / 'assets/style.css').read_text()
js = (site / 'assets/app.js').read_text()
html = html.replace('<link rel="stylesheet" href="./assets/style.css">', '<style>' + css.replace('</style', '<\\/style') + '</style>')
icon = base64.b64encode((site / 'favicon.svg').read_bytes()).decode()
html = html.replace('./favicon.svg', 'data:image/svg+xml;base64,' + icon)
script = 'window.ANATOMY_ASSETS=' + json.dumps(assets, separators=(',', ':')) + ';'
html = html.replace('<script src="./assets/app.js" defer></script>', '<script>' + script + '</script><script>' + re.sub(r'</script', r'<\\/script', js, flags=re.I) + '</script>')
# Preserve source and third-party notices within the portable file.
for name in ['ATTRIBUTION.md', 'THIRD_PARTY_LICENSES.txt']:
    file = root / name
    if file.exists():
        html += '\n<!-- ' + name + '\n' + file.read_text().replace('--', '—') + '\n-->'
out.write_text(html)
print(f'{out}\n{out.stat().st_size / 1024 / 1024:.1f} MiB')
