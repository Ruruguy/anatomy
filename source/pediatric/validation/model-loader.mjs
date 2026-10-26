import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const map=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
export async function resolve(specifier,context,nextResolve){if(map[specifier])return {url:map[specifier],shortCircuit:true};return nextResolve(specifier,context);}
