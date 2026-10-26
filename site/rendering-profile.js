// Shared display settings. These functions never modify model vertex positions.
export const TISSUE_COLORS={brain:'#c6b5ab',muscle:'#bf746b',bone:'#e8dfc8',nerve:'#e3c772',artery:'#bd4e59',vein:'#5988bb',heart:'#b95b65',respiratory:'#c998a9',digestive:'#bd946e',urinary:'#ad8ca4',endocrine:'#d7ad61',reproductive:'#b18ba5',lymphatic:'#82ad95',skin:'#c7a38a'};
export function createTissueMaterial(T,group){const organ=!['bone','nerve'].includes(group);return new T.MeshPhysicalMaterial({color:TISSUE_COLORS[group]||'#c6a99b',roughness:group==='bone'?.79:.66,metalness:0,clearcoat:organ?.06:0,clearcoatRoughness:.8,side:T.DoubleSide});}
export function ensureSurfaceNormals(geometry){if(!geometry.getAttribute('normal'))geometry.computeVertexNormals();return geometry;}
export function setSurfacePresentation(root,mode){root.traverse(mesh=>{if(!mesh.isMesh)return;for(const material of (Array.isArray(mesh.material)?mesh.material:[mesh.material])){if(!material?.color)continue;if(!material.userData.atlasColor)material.userData.atlasColor=material.color.clone();material.color.copy(mode==='specimen'?material.userData.atlasColor.clone().set('#d8cfc0'):material.userData.atlasColor);material.needsUpdate=true;}});}
export function setupMedicalLighting(T,renderer,scene,camera){
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 const rig=new T.Group();rig.name='Medical studio lighting';rig.add(new T.HemisphereLight(0xeaf3ff,0x526577,1.45));
 for(const [x,y,z,power,col] of [[-3,5,6,2.6,0xfff1e6],[4,1,4,1.1,0xd7eaff],[2,4,-5,1.85,0xd9f3ff]]){const light=new T.DirectionalLight(col,power);light.position.set(x,y,z);rig.add(light)}scene.add(rig);
 // A modest camera fill keeps concave surfaces readable when rotating the model.
 const fill=new T.DirectionalLight(0xe9f1ff,.55);fill.position.set(0,0,2);const target=new T.Object3D();target.position.set(0,0,-1);camera.add(fill,target);fill.target=target;if(!camera.parent)scene.add(camera);
 return rig;
}
