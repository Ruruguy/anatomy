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
  },
  {
    "id": "iba6",
    "file": "iba-06months-pial.glb",
    "button": "6 個月嬰兒腦皮質・MRI 圖譜",
    "title": "6 個月嬰兒腦皮質・IBA MRI 圖譜",
    "age": "6 個月；月齡群體 MRI 圖譜",
    "author": "Sahar Ahmad、Pew-Thian Yap；UNC-Chapel Hill",
    "source": "https://zenodo.org/records/7044932",
    "license": "CC BY-NC-SA 4.0（姓名標示－非商業－相同方式分享）",
    "topic": "neuro",
    "status": "unknown",
    "scope": "直接轉換 IBA 06Months 左右大腦半球 pial 表面，保留來源頂點與三角面，僅轉換座標軸。約 65 萬三角面。這是群體研究圖譜，不是單一嬰兒掃描；只含皮質外表面，不含小腦、腦幹、腦室或功能區分割。",
    "notes": "模型來源：Surface-Volume Atlases of the Infant Brain，Zenodo 7044932；相關論文 Multifaceted atlases of the human brain in its infancy (Nature Methods, 2022)，https://doi.org/10.1038/s41592-022-01703-z。沒有以成人腦縮放，也沒有另行捏造腦回。顯示尺寸不作量測。"
  },
  {
    "id": "iba60",
    "file": "iba-60months-pial.glb",
    "button": "5 歲兒童腦皮質・MRI 圖譜",
    "title": "5 歲兒童腦皮質・IBA MRI 圖譜",
    "age": "60 個月（5 歲）；學齡前群體 MRI 圖譜",
    "author": "Sahar Ahmad、Pew-Thian Yap；UNC-Chapel Hill",
    "source": "https://zenodo.org/records/7044932",
    "license": "CC BY-NC-SA 4.0（姓名標示－非商業－相同方式分享）",
    "topic": "neuro",
    "status": "unknown",
    "scope": "直接轉換 IBA 60Months 左右大腦半球 pial 表面，保留來源頂點與三角面，僅轉換座標軸。約 65 萬三角面。這是 5 歲群體研究圖譜，不代表 6 歲，也不能代表全部兒童；不含小腦、腦幹、腦室或功能區分割。",
    "notes": "來源資料集另外提供 36–60 個月學齡前圖譜。本模型使用其 60Months 原始 pial 網格，不是把 6 個月模型放大。只顯示皮質外表面；臨床判讀需其他資料。"
  }
];

export function referenceSystem(name){
 if(/lung/i.test(name))return 'resp';if(/OR_Heart/.test(name))return 'heart';if(/Cerebr|Cerebell/i.test(name)||/半球/.test(name))return 'neuro';if(/Kidney/i.test(name))return 'urinary';if(/Liver|Stomach|Gallbladder|Pancreas/i.test(name))return 'digest';if(/Spleen|Thymus/i.test(name))return 'immune';if(/_BO_|_CA_|_FC_|_LG_/.test(name))return 'bone';if(/_MU_/.test(name))return 'muscle';if(/_SK_|_FL_|^SK_|^FL_/.test(name))return 'skin';return 'other';
}
export function referenceVisible(name,names){
 if(!['bone','heart','resp','digest','urinary','immune','neuro'].includes(referenceSystem(name)))return false;
 if(/_3D/.test(name)){const canonical=s=>s.replace(/_3D|_2D|_Rigid/gi,'').toLowerCase();if(names.some(n=>/_2D/.test(n)&&canonical(n)===canonical(name)))return false}
 return true;
}

export function referenceLabel(name){const terms=[['CerebralCortex','大腦皮質'],['Cerebellum','小腦'],['Kidney','腎臟'],['Liver','肝臟'],['Stomach','胃'],['Gallbladder','膽囊'],['Spleen','脾臟'],['Thymus','胸腺'],['Lung','肺'],['Heart','心臟'],['Ribs','肋骨'],['Sternum','胸骨'],['Scapula','肩胛骨'],['Clavicle','鎖骨'],['Humerus','肱骨'],['Forearm','前臂骨'],['Femur','股骨'],['Tibia','脛骨'],['Fibula','腓骨'],['Patella','髕骨'],['Pelvis','骨盆'],['Sacrum','薦骨']];const term=terms.find(([en])=>name.includes(en));if(!term)return name;const side=/_L_/.test(name)?'左':/_R_/.test(name)?'右':'';return side+term[1]+' · '+name}
