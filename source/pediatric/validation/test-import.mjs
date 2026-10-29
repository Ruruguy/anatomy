import {researchModels,referenceSystem,referenceVisible,referenceLabel} from 'research-catalog';
import {setupMedicalLighting,setSurfacePresentation,ensureSurfaceNormals} from 'medical-rendering';
import {setReadableMaterial} from 'display-material';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as T from 'three';
import {topics,sources,neonatal} from 'content';
import {readFiles,parseModel,packBundle,unpackBundle,normalizeMetadata,escapeHTML,disposeObject,canonicalPath} from 'model-import';
globalThis.ProgressEvent=class {constructor(type,data){this.type=type;Object.assign(this,data)}};
const tests=[];async function test(name,f){await f();tests.push(name);console.log('PASS '+name)}
const bytes=s=>new TextEncoder().encode(s).buffer;
const stl=bytes('solid part\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid part');
const state={entry:'test.stl',files:[{name:'test.stl',data:stl}],metadata:normalizeMetadata({title:'<心臟>',age:'未知',source:'離線測試',notes:'繁中\n教學'}),labels:{'mesh-0':'構造 <一>'}};
await test('ASCII STL parses a surface',async()=>{const r=await parseModel(state);assert.equal(r.triangles,1);assert.equal(r.meshes,1);disposeObject(r.object)});
await test('Binary STL parses',async()=>{const b=new ArrayBuffer(134),v=new DataView(b);v.setUint32(80,1,true);v.setFloat32(108,1,true);v.setFloat32(124,1,true);const r=await parseModel({...state,files:[{name:'test.stl',data:b}]});assert.equal(r.triangles,1);disposeObject(r.object)});
await test('Teaching package preserves original bytes and metadata',()=>{const restored=unpackBundle(packBundle(state,state.metadata,state.labels));assert.deepEqual(restored,state);assert.equal(escapeHTML('<x>"&'), '&lt;x&gt;&quot;&amp;');assert.equal(normalizeMetadata({status:'unverified'}).status,'unknown')});
const floats=new Float32Array([0,0,0,1,0,0,0,1,0]);
const doc={asset:{version:'2.0'},buffers:[{uri:'shape.bin',byteLength:36}],bufferViews:[{buffer:0,byteLength:36}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,1,0]}],meshes:[{name:'部件 <一>',primitives:[{attributes:{POSITION:0}}]}],nodes:[{mesh:0,translation:[2,0,0]},{mesh:0,translation:[-2,1,0],scale:[-1,1,1]}],scenes:[{nodes:[0,1]}],scene:0};
const gltfState={...state,entry:'shape.gltf',files:[{name:'shape.gltf',data:bytes(JSON.stringify(doc))},{name:'shape.bin',data:floats.buffer}]};
await test('Multi-file GLTF preserves two meshes and transforms',async()=>{const r=await parseModel(gltfState);assert.equal(r.meshes,2);assert.equal(r.triangles,2);assert.equal(new T.Box3().setFromObject(r.object).getSize(new T.Vector3()).x,6);disposeObject(r.object)});
await test('Missing GLTF resources rejected',()=>assert.rejects(()=>parseModel({...gltfState,files:gltfState.files.slice(0,1)}),/缺少本機資源/));
await test('Remote resources rejected before network access',async()=>{const d=structuredClone(doc);d.buffers[0].uri='https://invalid.example/shape.bin';await assert.rejects(()=>parseModel({...gltfState,files:[{name:'shape.gltf',data:bytes(JSON.stringify(d))}]}),/網路或絕對路徑/);assert.throws(()=>canonicalPath('../secret'),/上一層/)});
await test('Animated and morph models rejected explicitly',async()=>{for(const d of [{...doc,animations:[{}]},{...doc,meshes:[{primitives:[{targets:[{}]}]}]}])await assert.rejects(()=>parseModel({...gltfState,files:[{name:'shape.gltf',data:bytes(JSON.stringify(d))}]}),/靜態模型/)});
await test('Empty and invalid files rejected',async()=>{await assert.rejects(()=>parseModel({...state,files:[{name:'test.stl',data:bytes('solid empty\nendsolid empty')}]}));await assert.rejects(()=>readFiles([]));assert.throws(()=>unpackBundle('{"format":"wrong"}'))});
await test('Original skull GLB loads through importer',async()=>{const raw=fs.readFileSync('models/nih-3169-skull.glb');const r=await parseModel({...state,entry:'skull.glb',files:[{name:'skull.glb',data:raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)}]});assert.equal(r.triangles,660830);disposeObject(r.object)});
// Node-only interaction harness: checks event wiring/state, without a browser or WebGL renderer.
class Element{constructor(){this.value='';this.dataset={};this.style={};this.attributes={};this.children=[];this.classList={toggle(){return false}}}set innerHTML(s){this.html=s;for(const m of s.matchAll(/id="([^"]+)"/g))elements.set('#'+m[1],new Element())}get innerHTML(){return this.html||''}setAttribute(k,v){this.attributes[k]=v}getAttribute(k){return this.attributes[k]}addEventListener(){}remove(){}append(){}click(){this.onclick?.()}showModal(){}close(){}}
const elements=new Map();const query=s=>{if(s.includes('.model-empty'))return null;if(!elements.has(s))elements.set(s,new Element());return elements.get(s)};
const ageButtons=['infant','child'].map(age=>{const b=new Element();b.dataset.age=age;return b});const sourceButton=new Element();sourceButton.dataset.reference='piper6';
const document={querySelector:query,querySelectorAll:selector=>{const parts=selector.split(',');return [...(parts.includes('[data-age]')?ageButtons:[]),...(parts.includes('[data-reference]')?[sourceButton]:[])]},createElement:()=>new Element()};
let modelFetch=async()=>{throw Error('Unexpected model request')};
const context=vm.createContext({researchModels,referenceSystem,referenceVisible,referenceLabel,normalizeMetadata,ensureSurfaceNormals,setupMedicalLighting,setSurfacePresentation,setReadableMaterial,T,topics,sources,neonatal,readFiles,parseModel,packBundle,escapeHTML,disposeObject,document,console,URL,Blob,setTimeout,atob,Uint8Array,fetch:(...args)=>modelFetch(...args)});
let app=fs.readFileSync('app.js','utf8').replace(/^import .*?;\n/gm,'');app=app.replace('const researchAssets=__RESEARCH_ASSETS__','const researchAssets={piper6:"piper-6yo-pedestrian.glb"}');app=app.slice(0,app.lastIndexOf('\nrenderKnowledge();\ntry{'));
vm.runInContext(app+`\nroot=new T.Group();camera=new T.PerspectiveCamera(34,1,.01,100);controls={target:new T.Vector3(),update(){}};globalThis.testAPI={importLocal,buildModel,setTopic,choose,getState:()=>({items,importedMode,importedState,selected,root,camera,controls,age})};`,context);
await test('Import UI state, focus, visibility, labels, opacity, and failure rollback',async()=>{
 const api=context.testAPI;await api.importLocal(gltfState);let s=api.getState();assert(s.importedMode);assert.equal(s.items.length,2);
 const bounds=new T.Box3().setFromObject(s.root);assert(Math.abs(bounds.getSize(new T.Vector3()).x-3)<1e-6);assert(bounds.getCenter(new T.Vector3()).length()<1e-6);
 api.choose(s.items[1]);query('#part-solo').onclick();assert.equal(s.items.filter(i=>i.object.visible).length,1);assert(s.controls.target.distanceTo(new T.Box3().setFromObject(s.items[1].object).getCenter(new T.Vector3()))<1e-6);
 query('#part-all').onclick();assert(s.items.every(i=>i.object.visible));query('#part-opacity').oninput({target:{value:'40'}});assert.equal(s.items[0].object.children[0].material.opacity,.4);
 query('#part-label').onchange({target:{value:'自訂 <標籤>'}});assert.equal(s.importedState.labels['mesh-1'],'自訂 <標籤>');assert(query('#knowledge').innerHTML.includes('自訂 &lt;標籤&gt;'));
 query('#import-topic').onchange({target:{value:'neuro'}});assert(query('#import-lesson').innerHTML.includes('神經系統'));assert.equal(s.importedState.metadata.topic,'neuro');
 const before=s.root.children.slice();await api.importLocal({...state,entry:'missing'});assert.deepEqual(api.getState().root.children,before);assert(query('#import-status').textContent.includes('無法匯入'));
 api.setTopic('neuro');s=api.getState();assert(!s.importedMode);assert(!s.items.some(i=>i.name.includes('大腦')));assert(s.items.some(i=>i.system==='neuro'));assert(query('#knowledge').innerHTML.includes('未提供精細腦部模型'));
});
await test('Research body keeps sourced meshes while filtering systems, with no schematic fallback',async()=>{const raw=fs.readFileSync('models/piper-6yo-pedestrian.glb');const ref=researchModels.find(r=>r.id==='piper6');const state={entry:ref.file,files:[{name:ref.file,data:raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)}],metadata:normalizeMetadata(ref),labels:{},reference:'piper6'};const api=context.testAPI;await api.importLocal(state);assert.equal(api.getState().items.length,286);assert(query('#knowledge').innerHTML.includes('PIPER'));api.setTopic('resp');let visible=api.getState().items.filter(i=>i.object.visible);assert.equal(visible.length,2);assert(visible.every(i=>i.originalName.includes('Lung')));assert.equal(api.getState().importedState.reference,'piper6');api.setTopic('endo');assert.equal(api.getState().items.filter(i=>i.object.visible).length,0);assert.equal(api.getState().items.length,286);api.setTopic('all');assert(api.getState().items.filter(i=>i.object.visible).length>50);});
await test('Age controls retain infant lessons and PIPER after MRI model removal',async()=>{
 const api=context.testAPI,raw=fs.readFileSync('models/piper-6yo-pedestrian.glb');
 const response=()=>({ok:true,arrayBuffer:async()=>raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)});
 modelFetch=async url=>{assert.equal(url,'piper-6yo-pedestrian.glb');return response()};
 await ageButtons[0].onclick();assert.equal(api.getState().age,'infant');assert(!api.getState().importedMode);assert(query('#knowledge').innerHTML.includes('正在看：嬰兒'));assert.equal(ageButtons[0].attributes['aria-pressed'],true);
 await ageButtons[1].onclick();assert.equal(api.getState().importedState.reference,'piper6');assert.equal(api.getState().items.length,286);assert.equal(ageButtons[1].attributes['aria-pressed'],true);
 let release;modelFetch=()=>new Promise(resolve=>release=resolve);const pending=ageButtons[1].onclick();ageButtons[0].onclick();release(response());await pending;assert(!api.getState().importedMode);assert.equal(api.getState().age,'infant');assert(query('#knowledge').innerHTML.includes('正在看：嬰兒'));
});
await test('Clear material replaces black textured surfaces and restores original arrays',()=>{
 const root=new T.Group(),geometry=new T.BoxGeometry(),texture=new T.Texture();
 const original=new T.MeshStandardMaterial({color:0x000000,map:texture,metalness:1,vertexColors:true});
 const mesh=new T.Mesh(geometry,[original,original]);root.add(mesh);
 const before=Array.from(geometry.attributes.position.array),array=mesh.material;
 setReadableMaterial(root,true);assert(mesh.material.every(m=>m.color.r>.5&&m.metalness===0&&m.map===null&&!m.vertexColors));
 const first=mesh.material;setReadableMaterial(root,true);assert.equal(mesh.material,first);
 assert.deepEqual(Array.from(geometry.attributes.position.array),before);
 setReadableMaterial(root,false);assert.equal(mesh.material,array);assert.equal(mesh.material[0].map,texture);assert.equal(original.color.getHex(),0);
 disposeObject(root);
});
await test('Standalone HTML embeds dependencies, matches both entry points',()=>{const html=fs.readFileSync('index.html','utf8');assert.equal(html,fs.readFileSync('兒童嬰兒解剖教室_雙擊開啟.html','utf8'));assert(!html.includes('__SKULL_ASSET__'));assert(!/<script[^>]+src=["']https?:/i.test(html));assert(html.includes('匯入本機模型'));assert(!html.includes('嚴格年齡發育特徵'))});
console.log(JSON.stringify({passed:tests.length,tests,browserUI:'Not tested; Node-only loader and interaction state tests, no WebGL rendering.',medicalAccuracy:'Not certified'},null,2));
