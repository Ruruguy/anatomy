import * as T from 'three';
// Original materials and textures stay owned by the mesh until restoration.
export function setReadableMaterial(root,enabled){
 root.traverse(o=>{if(!o.isMesh)return;
 if(enabled){if(o.userData.originalDisplayMaterial)return;
 o.userData.originalDisplayMaterial=o.material;
 const make=()=>new T.MeshStandardMaterial({color:'#d9c2b3',roughness:.82,metalness:0,side:T.DoubleSide,emissive:'#1b2024',emissiveIntensity:.08});
 o.material=Array.isArray(o.material)?o.material.map(make):make();
 }else if(o.userData.originalDisplayMaterial){
 for(const m of (Array.isArray(o.material)?o.material:[o.material]))m.dispose();
 o.material=o.userData.originalDisplayMaterial;delete o.userData.originalDisplayMaterial;
 }
 });
}
