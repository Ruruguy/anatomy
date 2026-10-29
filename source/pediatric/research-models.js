export const researchModels=[
  {
    "id": "piper6",
    "file": "piper-6yo-pedestrian.glb",
    "button": "6 歲兒童全身・來源模型",
    "title": "6 歲兒童全身・PIPER",
    "age": "6 歲；來源為兒童行人生物力學模型",
    "author": "UCBL/Ifsttar、KTH、TU Berlin、PDB 與 CEESAR 等原作者",
    "source": "https://gitlab.com/piper-project.org/child_pedestrian",
    "license": "GPLv3 或更新版本，附原始責任與 Open Science 條款；足部來源 CC BY 4.0",
    "topic": "all",
    "status": "unknown",
    "scope": "由 PIPER 6 歲行人有限元素模型擷取可顯示表面，保留原始節點位置，只做座標軸轉換。含骨骼與部分胸腹器官；網格為生物力學用途而簡化，不是完整精細解剖圖譜，也不代表新生兒或嬰兒。梁元素、感測器及未具表面的構造未顯示。",
    "notes": "來源為研究用有限元素模型，正常／病理狀態不由本教室判定。預設隱藏外層皮膚、填充軟組織及部分重疊層，顯示骨骼和器官；可用分件清單還原。顏色是教學識別色。"
  }
];

// Classify PIPER source names; filler volumes and computational caps stay unassigned.
export function referenceSystem(name){
 if(/^TX_OR_[LR]_Lung_/.test(name))return 'resp';
 if(/^TX_OR_Heart_/.test(name))return 'heart';
 if(/^HE_OR_(CerebralCortex|Cerebellum)$/.test(name)||/^HE_(MG_|CF_CSF)/.test(name))return 'neuro';
 if(/^AB_OR_[LR]_Kidney_/.test(name))return 'urinary';
 if(/^AB_(OR_(Liver|Stomach|Gallbladder)|FT_Pancreas)_/.test(name))return 'digest';
 if(/^AB_OR_Spleen_|^TX_FT_Thymus_/.test(name))return 'immune';
 if(/_BO_|_CA_|_FC_|_LG_|_MU_.*Capsule|^UX_ELB_CAP_[LR]_(Hum|Rad)$/.test(name))return 'bone';
 if(/_MU_/.test(name)&&!/cavity|ObturatorForamen/i.test(name))return 'muscle';
 if(/_SK_|^SK_/.test(name))return 'skin';
 return 'other';
}
const canonicalPart=name=>name.replace(/_3D|_2D|_Rigid/gi,'').toLowerCase();
export function referenceVisible(name,names,topic='all'){
 const system=referenceSystem(name);
 if(topic==='all'?!['bone','heart','resp','digest','urinary','immune','neuro'].includes(system):system!==topic)return false;
 // Meninges/CSF are available in the nervous-system part list; keep the brain surface unobscured by default.
 if(system==='neuro'&&!/^HE_OR_(CerebralCortex|Cerebellum)$/.test(name))return false;
 if(name==='TX_MU_Subscapula_3D'&&names.some(n=>/^TX_MU_[LR]_Subscapula_2D$/.test(n)))return false;
 if(/_3D/i.test(name)&&names.some(n=>/_2D/i.test(n)&&canonicalPart(n)===canonicalPart(name)))return false;
 if(/_Rigid/i.test(name)&&names.some(n=>!/_Rigid/i.test(n)&&canonicalPart(n)===canonicalPart(name)))return false;
 if(/^TX_BO_Ribs_/.test(name)&&names.some(n=>/^TX_BO_[LR]_Rib\d+_2D/.test(n)))return false;
 return true;
}

export function referenceLabel(name){const areaLabels={'TX_MU_Intercostal_2D':'肋間區整體表面（來源整合層）','TX_MU_Diaphragm_2D':'橫膈表面（來源模型）','AB_MU_AbdominalWall_2D':'腹壁整體表面（非逐條肌肉）','TX_MU_L_Subscapula_2D':'左肩胛下區表面（來源簡化）','TX_MU_R_Subscapula_2D':'右肩胛下區表面（來源簡化）'};if(areaLabels[name])return areaLabels[name]+' · '+name;const terms=[['CerebralCortex','大腦皮質'],['Cerebellum','小腦'],['Kidney','腎臟'],['Liver','肝臟'],['Stomach','胃'],['Gallbladder','膽囊'],['Spleen','脾臟'],['Thymus','胸腺'],['Lung','肺'],['Heart','心臟'],['Ribs','肋骨'],['Sternum','胸骨'],['Scapula','肩胛骨'],['Clavicle','鎖骨'],['Humerus','肱骨'],['Forearm','前臂骨'],['Femur','股骨'],['Tibia','脛骨'],['Fibula','腓骨'],['Patella','髕骨'],['Pelvis','骨盆'],['Sacrum','薦骨']];const term=terms.find(([en])=>name.includes(en));if(!term)return name;const side=/_L_/.test(name)?'左':/_R_/.test(name)?'右':'';return side+term[1]+' · '+name}
