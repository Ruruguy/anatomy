import {setupMedicalLighting,setSurfacePresentation} from 'medical-rendering';
let surfaceStyle='atlas';
import {setReadableMaterial} from 'display-material';
let readableMode=false;
import {readFiles,parseModel,packBundle,escapeHTML,disposeObject} from 'model-import';
let importedMode=false,importedState=null,importOpacity=100,importSerial=0;
import * as T from 'three';
import {OrbitControls} from 'orbit';
import {GLTFLoader} from 'gltf';
const skullAsset='__SKULL_ASSET__';
let specimenMode=false,loadSerial=0;
import {topics,sources,neonatal} from 'content';
const $=s=>document.querySelector(s),host=$('#canvas-host');
let age='infant',topic='all',selected=null,items=[],dragMode='pan',expanded=false,labelsOn=true,renderer,controls,camera,scene,root,ready=false;
const vec=a=>new T.Vector3(...a),topicOf=id=>topics.find(t=>t.id===id),color=id=>topicOf(id)?.color||'#b9c9d0';
const refs=ids=>'<ul class="source-list">'+ids.map(i=>`<li><a target="_blank" rel="noopener" href="${sources[i][1]}">${sources[i][0]}</a></li>`).join('')+'</ul>';
function showModal(html){$('#modal-content').innerHTML=html;$('#modal').showModal()}
$('#close-modal').onclick=()=>$('#modal').close();$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
$('#newborn').onclick=()=>showModal(`<span class="eyebrow">NEONATAL TRANSITION</span><h2>${neonatal.title}</h2><p>${neonatal.text}</p>${neonatal.cards.map(c=>`<article><h3>${c[0]}</h3><p>${c[1]}</p></article>`).join('')}${refs(neonatal.refs)}`);
$('#about').onclick=()=>showModal(`<h2>模型範圍與資料來源</h2><p>本教室包含來源顱骨網格、全身幾何示意與使用者匯入的模型。全身示意未經解剖精度驗證，不能用來辨識細微構造或量測。原有幾何大腦已移除，等待來源與年齡明確的模型。</p><p>匯入不會自動驗證醫學正確性。請記錄作者、來源、年齡、授權及正常／病理狀態。檔案只在本機處理。</p><p>顱骨：Nevit Dilmen，NIH 3D 3DPX-003169 v2，CC BY-SA 4.0；13 個月幼兒。NIH 收錄不等於醫學認證。</p>${refs(sources.map((_,i)=>i))}`);
$('#systems').innerHTML=topics.map(t=>`<button data-topic="${t.id}" aria-pressed="${t.id===topic}"><i style="background:${t.color}"></i>${t.name}</button>`).join('');
function renderKnowledge(){if(importedMode){renderImportedKnowledge();return}if(specimenMode){renderSpecimenKnowledge();return}const t=topicOf(topic),index=topics.indexOf(t);$('#number').textContent=String(index).padStart(2,'0')+' / 11';$('#scene-title').textContent=t.name;$('#age-label').textContent=age==='infant'?'INFANT / 嬰兒示意':'CHILD / 兒童示意';
 $('#knowledge').innerHTML=`<span class="topic-en">${t.en}</span><h2>${t.name}</h2><p>${t.intro}</p><div class="active-age"><div class="section-label">${age==='infant'?'正在看：嬰兒':'正在看：兒童'}</div><p>${t[age]}</p></div><div class="compare"><div><strong>${age==='infant'?'兒童階段':'嬰兒階段'}</strong><p>${t[age==='infant'?'child':'infant']}</p></div><div><strong>比較與理解</strong><p>${t.adult}</p></div></div><details id="structures"><summary>構造清單與單獨觀察</summary><select id="organ" aria-label="選擇構造"><option value="">請選擇構造</option>${items.filter(i=>topic==='all'||i.system===topic).map(i=>`<option value="${i.id}">${i.name}</option>`).join('')}</select><div class="focus-row"><button id="focus" disabled>單獨放大構造</button><button id="show-system">返回本系統</button></div><p class="coverage">可點選 3D 構造，也可使用清單。模型為代表性示意，並非完整器官列表。</p></details>${topic==='neuro'?'<p class="coverage">大腦模型暫缺：原幾何大腦已移除，目前僅顯示神經走向示意。</p>':''}<h3>教學觀察</h3><p>${t.point}</p><div class="question"><span class="section-label">課堂提問</span><p>${t.q}</p><button id="answer-toggle" aria-expanded="false">顯示解答</button><div id="answer" class="answer" hidden>${t.a}</div></div><details><summary>本主題資料來源</summary>${refs(t.refs)}</details>`;
 $('#answer-toggle').onclick=()=>{const b=$('#answer-toggle'),open=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',!open);b.textContent=open?'顯示解答':'收起解答';$('#answer').hidden=open};
 $('#organ').onchange=e=>choose(items.find(i=>i.id===e.target.value)||null);
 $('#focus').onclick=()=>{if(selected){for(const i of items)i.object.visible=i===selected;updateLabels();fit(new T.Box3().setFromObject(selected.object))}};
 $('#show-system').onclick=()=>{applyVisibility();choose(null);fitVisible()};
}
function add(name,system){const object=new T.Group();root.add(object);const item={id:'part-'+items.length,name,system,object,base:new T.Vector3()};items.push(item);return item}
function mat(item,opts={}){
  const baseCol = opts.color || color(item.system);
  return new T.MeshStandardMaterial({
    color: baseCol,
    roughness: opts.roughness ?? 0.67,
    metalness: opts.metalness ?? 0,
    ...opts
  });
}
function ell(item,pos,scale,opts={}){
  const geom = new T.SphereGeometry(1, 48, 32);
  const m = new T.Mesh(geom, mat(item, opts));
  m.position.fromArray(pos);
  m.scale.fromArray(scale);
  m.userData.item = item;
  item.object.add(m);
  return m;
}
function tube(item,points,r=.025,opts={}){
  const curve = new T.CatmullRomCurve3(points.map(vec));
  const segs = Math.max(24, points.length * 12);
  const geom = new T.TubeGeometry(curve, segs, r, 16, false);
  const m = new T.Mesh(geom, mat(item, opts));
  m.userData.item = item;
  item.object.add(m);
  return m;
}
function bone(item,a,b,r=.042,headScale=1.4){
  tube(item, [a, b], r, {color:'#f2ede4', roughness:0.45});
  ell(item, a, [r*headScale, r*1.2, r*headScale], {color:'#eee7db', roughness:0.42});
  ell(item, b, [r*headScale, r*1.2, r*headScale], {color:'#eee7db', roughness:0.42});
}
function dispose(){surfaceStyle='atlas';$('#surface-style').setAttribute('aria-pressed','false');$('#surface-style').textContent='灰白標本';setReadableMaterial(root,false);readableMode=false;$('#readable-material').setAttribute('aria-pressed','false');disposeObject(root);root.clear();items=[];selected=null}


function buildModel(){
  ++loadSerial;
  document.querySelectorAll('[data-topic]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.topic===topic));
  specimenMode=false;importedMode=false;$('#show-imported').setAttribute('aria-pressed','false');
  document.querySelectorAll('[data-age]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.age===age));
  $('#source-skull').setAttribute('aria-pressed','false');
  $('.stage-note').innerHTML='<span class="dot"></span>全身幾何示意 · 未經解剖精度驗證 · 比例不可量測';
  dispose();

  const infant = age === 'infant';
  // Pediatric proportions: Infants have large heads, high diaphragms, horizontal ribs, and shorter limbs
  const hip = infant ? 1.15 : 1.56;
  const shoulder = infant ? 2.18 : 2.70;
  const headY = infant ? 2.85 : 3.28;
  const headR = infant ? 0.52 : 0.43;
  const w = infant ? 0.43 : 0.47;
  const cy = shoulder - 0.35;
  const diaphragmY = shoulder - (infant ? 0.60 : 0.65);
  const abd = diaphragmY - 0.26;

  // 1. SKIN / 體表輪廓（半透明真實身形）
  const skin = add('體表輪廓（示意）','skin');
  // Cranium and cheeks
  ell(skin, [0, headY, 0], [headR * 0.90, headR * 0.98, headR * 0.92]);
  ell(skin, [0, headY - 0.18, 0.28], [headR * 0.66, headR * 0.46, headR * 0.42]); // Cheeks & jaw
  ell(skin, [0, shoulder + 0.08, 0], [0.18, 0.20, 0.17]); // Neck
  // Torso: Infants have round, prominent abdomen
  ell(skin, [0, (hip + shoulder) * 0.52, infant ? 0.03 : 0], [w, (shoulder - hip) * 0.62, infant ? 0.32 : 0.29]);
  ell(skin, [0, hip, 0], [w * 0.86, 0.24, 0.26]);
  // Orientation facial landmarks (nose & ears)
  ell(skin, [0, headY - 0.11, headR * 0.88], [0.065, 0.08, 0.085]);
  for (const s of [-1, 1]) {
    ell(skin, [s * headR * 0.32, headY + 0.005, headR * 0.84], [0.035, 0.018, 0.015], {color:'#687d83'});
    ell(skin, [s * headR * 0.89, headY - 0.08, 0], [0.055, 0.09, 0.055]);
  }
  // Limbs
  const armPoints = [], legPoints = [];
  for (const s of [-1, 1]) {
    const arm = [
      [s * w * 0.96, shoulder - 0.04, 0],
      [s * (w + 0.21), shoulder - 0.46, 0],
      [s * (w + 0.28), hip + 0.29, 0.04]
    ];
    // Pediatric lower limb alignment:
    // Infant (~6mo) shows physiologic genu varum (mild lateral bowing);
    // Child (~6yo) shows transition from physiologic genu valgum toward neutral alignment.
    const legKneeX = infant ? s * 0.25 : s * 0.20;
    const leg = [
      [s * 0.20, hip - 0.07, 0],
      [legKneeX, hip * 0.50, infant ? 0.02 : 0],
      [s * 0.25, 0.13, 0]
    ];
    armPoints.push(arm);
    legPoints.push(leg);
    tube(skin, arm, infant ? 0.115 : 0.10);
    ell(skin, [arm[2][0], arm[2][1] - 0.10, 0.055], [0.09, 0.14, 0.06]); // Hands
    tube(skin, leg, infant ? 0.14 : 0.125);
    ell(skin, [s * 0.25, 0.085, 0.10], [0.12, 0.085, 0.21]); // Feet
  }

  // 2. SKELETON / 骨骼系統
  const skull = add(infant ? '顱骨、前囟與顱縫' : '顱骨與閉合骨縫痕跡', 'bone');
  // Neurocranium with open fontanelle feature for infant, suture lines for child
  ell(skull, [0, headY, -0.02], [headR * 0.88, headR * 0.96, headR * 0.86], {transparent:true, opacity:0.25, depthWrite:false, wireframe:true, color:'#e7decb'});
  if (infant) {
    // Diamond-shaped Anterior Fontanelle (前囟，約12-18個月閉合)
    const f = ell(skull, [0, headY + headR * 0.84, 0.19], [0.11, 0.018, 0.11], {color:'#9be6d2', roughness:0.3});
    f.rotation.z = Math.PI / 4;
    // Posterior Fontanelle area (後囟，約2-3個月閉合，此時近閉合小凹)
    ell(skull, [0, headY + headR * 0.65, -headR * 0.80], [0.045, 0.015, 0.04], {color:'#8cd3bf', roughness:0.35});
    // Open Cranial Sutures (矢狀縫 Sagittal & 冠狀縫 Coronal)
    tube(skull, [[0, headY + headR * 0.84, 0.18], [0, headY + headR * 0.72, -headR * 0.76]], 0.007, {color:'#7acdb8'}); // Sagittal suture
    tube(skull, [[-headR * 0.75, headY + headR * 0.50, 0.08], [0, headY + headR * 0.84, 0.18], [headR * 0.75, headY + headR * 0.50, 0.08]], 0.007, {color:'#7acdb8'}); // Coronal suture
  } else {
    // Child: Closed fontanelles with distinct anatomical suture ridges (冠狀縫、矢狀縫、人字縫)
    tube(skull, [[0, headY + headR * 0.84, 0.18], [0, headY + headR * 0.72, -headR * 0.76]], 0.006, {color:'#cfc3ad'}); // Sagittal suture
    tube(skull, [[-headR * 0.75, headY + headR * 0.50, 0.08], [0, headY + headR * 0.84, 0.18], [headR * 0.75, headY + headR * 0.50, 0.08]], 0.006, {color:'#cfc3ad'}); // Coronal suture
    tube(skull, [[-headR * 0.68, headY + headR * 0.35, -headR * 0.65], [0, headY + headR * 0.65, -headR * 0.78], [headR * 0.68, headY + headR * 0.35, -headR * 0.65]], 0.006, {color:'#cfc3ad'}); // Lambdoid suture
  }
  const axial = add('脊柱、胸廓與骨盆（簡化）','bone');
  // Vertebral column with physiological curves
  for (let j = 0; j < 22; j++) {
    const frac = j / 21;
    const y = hip - 0.04 + frac * (shoulder - hip + 0.16);
    // Slight pediatric spinal curve (infant is straighter/c-curve, child develops cervical/lumbar lordosis)
    const zOffset = -0.17 + (infant ? 0.005 * Math.sin(frac * Math.PI) : 0.024 * Math.sin(frac * Math.PI * 2));
    ell(axial, [0, y, zOffset], [0.048, 0.022, 0.052], {color:'#f0eae1'});
    // Spinous process projection
    ell(axial, [0, y, zOffset - 0.04], [0.015, 0.018, 0.035], {color:'#e4dcce'});
  }
  // Sternum: Manubrium, body, xiphoid
  const sternumY = (shoulder + diaphragmY) * 0.52;
  tube(axial, [[0, shoulder - 0.10, 0.21], [0, sternumY, 0.22], [0, diaphragmY + 0.04, 0.21]], 0.026, {color:'#eee6da'});
  ell(axial, [0, shoulder - 0.11, 0.21], [0.055, 0.032, 0.02], {color:'#eee6da'}); // Manubrium
  ell(axial, [0, diaphragmY + 0.03, 0.21], [0.018, 0.025, 0.015], {color:'#d1e6df'}); // Xiphoid process

  // Ribs (Infant has horizontal ribs & barrel-chest; Child has downward-sloping ribs)
  for (let j = 0; j < 9; j++) {
    const y = shoulder - 0.14 - j * ((shoulder - diaphragmY + 0.08) / 9);
    const rx = w * (0.64 + 0.22 * Math.sin((j / 9) * Math.PI));
    const slope = infant ? 0.015 : 0.058; // Infant ribs are horizontal
    for (const s of [-1, 1]) {
      // Rib arc from spine to sternum
      tube(axial, [
        [0, y, -0.16],
        [s * rx * 0.72, y + 0.02, -0.14],
        [s * rx, y, 0],
        [s * rx * 0.76, y - slope, 0.16],
        [s * 0.035, y - slope * 1.3, 0.21]
      ], 0.016, {color: j < 7 ? '#f0eae1' : '#dfede8'}); // True & false ribs
    }
  }
  // Clavicles & Pelvis
  for (const s of [-1, 1]) {
    tube(axial, [[s * 0.03, shoulder - 0.08, 0.17], [s * 0.20, shoulder - 0.02, 0.14], [s * w * 0.92, shoulder - 0.04, 0.04]], 0.022, {color:'#eee6da'});
    // Iliac crest and pelvic bowl
    const p = ell(axial, [s * 0.22, hip - 0.01, -0.08], [0.18, 0.21, 0.085], {color:'#eee5d7'});
    p.rotation.z = s * -0.28;
    p.rotation.y = s * 0.18;
  }
  // Limbs with Epiphyseal Growth Plates (生長板) & Carpal Ossification (腕骨骨化核)
  const limbs = add('四肢長骨、生長板與腕骨化核', 'bone');
  const muscles = add('四肢及軀幹代表肌群','muscle');
  [...armPoints, ...legPoints].forEach((pts, k) => {
    for (let j = 0; j < 2; j++) {
      const a = vec(pts[j]), b = vec(pts[j+1]);
      bone(limbs, pts[j], pts[j+1], k < 2 ? 0.034 : 0.052, 1.45);
      // Growth Plates at both ends of pediatric long bones (Physis)
      for (const f of [0.12, 0.88]) {
        const c = a.clone().lerp(b, f);
        const d = b.clone().sub(a).normalize().multiplyScalar(0.016);
        tube(limbs, [c.clone().sub(d).toArray(), c.clone().add(d).toArray()], k < 2 ? 0.044 : 0.065, {color:'#7de4c5', roughness:0.25});
      }
      const center = a.clone().lerp(b, 0.5);
      const m = ell(muscles, center.toArray(), [k < 2 ? 0.10 : 0.13, a.distanceTo(b) * 0.53, k < 2 ? 0.10 : 0.13], {color:'#d17f69'});
      m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    }
  });

  // Pediatric carpal ossification centers (腕骨骨化中心):
  // ~6mo infant: capitate & hamate (2 centers); ~6yo child: 6-7 carpal centers present
  for (const s of [-1, 1]) {
    const wristPos = [s * (w + 0.28), hip + 0.27, 0.04];
    if (infant) {
      // Capitate (頭狀骨) & Hamate (鉤骨)
      ell(limbs, [wristPos[0], wristPos[1], wristPos[2]], [0.016, 0.016, 0.014], {color:'#f8f4eb', roughness:0.3});
      ell(limbs, [wristPos[0] + s * 0.018, wristPos[1] - 0.012, wristPos[2]], [0.014, 0.014, 0.012], {color:'#f8f4eb', roughness:0.3});
    } else {
      // Child (~6yo): Capitate, hamate, triquetrum, lunate, scaphoid, trapezium
      for (let ox of [-0.02, 0, 0.02]) {
        for (let oy of [-0.015, 0.012]) {
          ell(limbs, [wristPos[0] + s * ox, wristPos[1] + oy, wristPos[2]], [0.013, 0.013, 0.011], {color:'#f8f4eb', roughness:0.3});
        }
      }
    }
  }

  // Pectoralis and rectus abdominis
  for (const s of [-1, 1]) {
    ell(muscles, [s * 0.19, shoulder - 0.23, 0.19], [0.21, 0.18, 0.075], {color:'#c87460'});
    for (let j = 0; j < 3; j++) {
      ell(muscles, [s * 0.08, abd + 0.16 - j * 0.13, 0.25], [0.072, 0.07, 0.045], {color:'#c87460'});
    }
  }

  // 3. BRAIN & NERVES / 神經系統
  // Pediatric Spinal Cord (Conus Medullaris 脊髓圓錐終止水平):
  // Infant conus medullaris terminates lower (around L2-L3, tapering to filum terminale);
  // Child conus medullaris ascends to adult level (L1-L2).
  const cord = add('脊髓、圓錐與神經走向','neuro');
  const cordEndY = infant ? (hip + 0.11) : (hip + 0.19); // Infant ends lower along lumbar spine
  tube(cord, [[0, headY - 0.30, -0.10], [0, shoulder, -0.12], [0, cordEndY, -0.14]], 0.027, {color:'#e4d3f5'});
  // Conus medullaris taper & cauda equina (馬尾神經束)
  tube(cord, [[0, cordEndY, -0.14], [0, hip - 0.04, -0.13]], 0.013, {color:'#e2d2f2'});
  for (const s of [-1, 1]) {
    tube(cord, [[0, cordEndY - 0.02, -0.14], [s * 0.025, hip - 0.06, -0.13]], 0.008, {color:'#dbbee8'});
    // Brachial and lumbosacral plexus
    tube(cord, [[0, shoulder - 0.07, -0.10], [s * w, shoulder - 0.06, -0.09], ...armPoints[s===-1?0:1].slice(1)], 0.012, {color:'#d5bee8'});
    tube(cord, [[0, hip + 0.16, -0.13], ...legPoints[s===-1?0:1]], 0.015, {color:'#d5bee8'});
  }

  // 4. AIRWAY & LUNGS / 呼吸與氣道 (兒科漏斗型喉部、三葉右肺、雙葉左肺)
  const airway = add('氣管與主支氣管','resp');
  // Pediatric Larynx:
  // Infant larynx is higher (around C3-C4 level), more anterior, and funnel-shaped with cricoid ring as narrowest non-distensible point.
  // Child larynx descends toward C5 level, becoming more cylindrical.
  const larynxY = infant ? (shoulder + 0.24) : (shoulder + 0.18);
  const cricoidY = infant ? (shoulder + 0.16) : (shoulder + 0.12);
  ell(airway, [0, larynxY, 0.055], [infant ? 0.050 : 0.054, 0.052, 0.056], {color:'#d2eaf0', roughness:0.35}); // Thyroid cartilage
  ell(airway, [0, cricoidY, 0.052], [infant ? 0.038 : 0.044, 0.034, infant ? 0.040 : 0.046], {color:'#b5dee8', roughness:0.32}); // Cricoid ring
  tube(airway, [[0, cricoidY, 0.052], [0, shoulder - 0.12, 0.06], [0, cy + 0.05, 0.08]], 0.034, {color:'#c6e5ee'});
  // Tracheal rings
  for (let j = 0; j < 7; j++) {
    const ring = new T.Mesh(new T.TorusGeometry(0.036, 0.0055, 8, 24), mat(airway, {color:'#d9f1f7', roughness:0.3}));
    ring.position.set(0, shoulder + 0.09 - j * 0.048, 0.06);
    ring.rotation.x = Math.PI / 2;
    ring.userData.item = airway;
    airway.object.add(ring);
  }
  // Carina branching (Pediatric: right bronchus steeper, left more angled)
  tube(airway, [[0, cy + 0.05, 0.08], [-0.10, cy - 0.01, 0.06], [-0.20, cy - 0.08, 0.03]], 0.026, {color:'#c6e5ee'}); // Right main bronchus (steep)
  tube(airway, [[0, cy + 0.05, 0.08], [0.12, cy + 0.01, 0.06], [0.22, cy - 0.07, 0.025]], 0.023, {color:'#c6e5ee'});  // Left main bronchus (angulated)

  // Anatomical Lungs: Right = 3 lobes (Superior, Middle, Inferior); Left = 2 lobes + Cardiac Notch + Lingula
  for (const s of [-1, 1]) {
    const lung = add(s === -1 ? '右肺（外形示意）' : '左肺（外形示意）', 'resp');
    const lungMat = {color: s === -1 ? '#4e8aa8' : '#5290b0', roughness: 0.38};
    const lx = s * w * 0.53;
    if (s === -1) {
      // Right Lung: 3 Lobes
      // Superior Lobe
      const sup = ell(lung, [lx, cy + 0.10, 0.02], [w * 0.36, 0.15, 0.18], lungMat);
      sup.rotation.z = 0.08;
      // Middle Lobe (anterior-medial wedge)
      const mid = ell(lung, [lx + 0.03, cy - 0.02, 0.08], [w * 0.32, 0.11, 0.15], lungMat);
      mid.rotation.z = 0.05;
      // Inferior Lobe (large posterior-basal)
      const infL = ell(lung, [lx - 0.02, cy - 0.12, -0.02], [w * 0.38, 0.16, 0.19], lungMat);
      infL.rotation.z = -0.06;
      // Fissures (Horizontal & Oblique fissure groves)
      tube(lung, [[lx + 0.12, cy + 0.02, 0.15], [lx, cy, 0.18], [lx - 0.12, cy - 0.02, 0.12]], 0.006, {color:'#2d5870'});
      tube(lung, [[lx + 0.08, cy + 0.12, -0.04], [lx, cy - 0.05, 0.02], [lx - 0.10, cy - 0.18, 0.14]], 0.007, {color:'#2d5870'});
    } else {
      // Left Lung: 2 Lobes + Cardiac Notch (心切跡)
      // Superior Lobe with Lingula (舌葉)
      const sup = ell(lung, [lx, cy + 0.09, 0.02], [w * 0.34, 0.16, 0.17], lungMat);
      sup.rotation.z = -0.08;
      // Lingula extension around heart apex
      ell(lung, [lx - 0.06, cy - 0.07, 0.08], [w * 0.18, 0.10, 0.12], lungMat);
      // Inferior Lobe
      const infL = ell(lung, [lx + 0.02, cy - 0.11, -0.02], [w * 0.37, 0.17, 0.18], lungMat);
      infL.rotation.z = 0.06;
      // Oblique Fissure
      tube(lung, [[lx - 0.06, cy + 0.13, -0.05], [lx, cy - 0.04, 0.03], [lx + 0.10, cy - 0.18, 0.12]], 0.007, {color:'#2d5870'});
    }
  }
  // Diaphragm (橫膈): Convex domes, right dome elevated by liver
  const diaphragm = add('橫膈（胸腹分界示意）','resp');
  ell(diaphragm, [-0.10, diaphragmY + 0.02, 0], [w * 0.44, 0.042, 0.24], {color:'#b8a5cf', roughness:0.42}); // Right dome (higher)
  ell(diaphragm, [0.12, diaphragmY, 0], [w * 0.40, 0.038, 0.23], {color:'#b8a5cf', roughness:0.42});       // Left dome

  // 5. HEART & VASCULATURE / 心臟與循環 (兒科橫位心臟、心房心室、大動脈弓三大分支、肺動脈幹)
  const heart = add('心臟（外形示意）','heart');
  // Pediatric cardiac axis:
  // Infant heart is more horizontally oriented (transverse axis), with apex located higher (4th intercostal space, lateral to midclavicular line).
  // Child heart descends toward adult oblique axis (apex at 5th intercostal space, medial to midclavicular line).
  const heartRotZ = infant ? 0.44 : 0.25;
  const hPos = [infant ? 0.055 : 0.035, infant ? (cy - 0.02) : (cy - 0.05), 0.14];

  // Left Ventricle (Apex former)
  const lv = ell(heart, [hPos[0] + 0.045, hPos[1] - 0.03, hPos[2]], [0.115, 0.17, 0.105], {color:'#bf455b', roughness:0.35});
  lv.rotation.z = heartRotZ;
  // Sculpt apex taper
  const lvp = lv.geometry.attributes.position;
  for (let k = 0; k < lvp.count; k++) {
    const y = lvp.getY(k);
    if (y < 0) {
      const f = 1 + y * 0.42;
      lvp.setX(k, lvp.getX(k) * Math.max(0.2, f));
      lvp.setZ(k, lvp.getZ(k) * Math.max(0.2, f));
    }
  }
  lv.geometry.computeVertexNormals();

  // Right Ventricle (Anterior surface & conus arteriosus; relatively larger in infant due to fetal circulation)
  const rv = ell(heart, [hPos[0] - 0.045, hPos[1] + 0.01, hPos[2] + 0.04], [infant ? 0.105 : 0.095, 0.14, 0.075], {color:'#c95a6f', roughness:0.36});
  rv.rotation.z = heartRotZ * 0.7;

  // Interventricular groove (前室間溝)
  tube(heart, [
    [hPos[0] - 0.01, hPos[1] + 0.08, hPos[2] + 0.07],
    [hPos[0] + 0.02, hPos[1] - 0.02, hPos[2] + 0.06],
    [hPos[0] + 0.08, hPos[1] - 0.14, hPos[2] + 0.02]
  ], 0.007, {color:'#8e2638'});

  // Right Atrium & Auricle (右心房與右心耳)
  ell(heart, [hPos[0] - 0.095, hPos[1] + 0.09, hPos[2] - 0.01], [0.075, 0.075, 0.065], {color:'#8d374b', roughness:0.38});
  ell(heart, [hPos[0] - 0.065, hPos[1] + 0.095, hPos[2] + 0.045], [0.048, 0.048, 0.038], {color:'#9c4155', roughness:0.38}); // Right auricle

  // Left Atrium & Auricle (左心房與左心耳)
  ell(heart, [hPos[0] + 0.085, hPos[1] + 0.10, hPos[2] - 0.04], [0.070, 0.068, 0.060], {color:'#8d374b', roughness:0.38});
  ell(heart, [hPos[0] + 0.065, hPos[1] + 0.08, hPos[2] + 0.05], [0.045, 0.042, 0.035], {color:'#9c4155', roughness:0.38}); // Left auricle

  // Pulmonary Trunk & Bifurcation (肺動脈幹跨越前方並分叉為左右肺動脈)
  tube(heart, [
    [hPos[0] - 0.02, hPos[1] + 0.07, hPos[2] + 0.06],
    [hPos[0] + 0.005, hPos[1] + 0.15, hPos[2] + 0.05],
    [hPos[0] + 0.04, hPos[1] + 0.18, hPos[2] - 0.01]
  ], 0.034, {color:'#4883ab', roughness:0.32});
  // Left and Right Pulmonary Arteries
  tube(heart, [[hPos[0] + 0.04, hPos[1] + 0.18, hPos[2] - 0.01], [hPos[0] + 0.18, hPos[1] + 0.17, hPos[2] - 0.06]], 0.022, {color:'#4883ab'});
  tube(heart, [[hPos[0] + 0.04, hPos[1] + 0.18, hPos[2] - 0.01], [hPos[0] - 0.14, hPos[1] + 0.17, hPos[2] - 0.07]], 0.022, {color:'#4883ab'});

  // Ascending Aorta & Aortic Arch with 3 Classic Branches (主動脈弓與三大分支)
  // Arch curving backward over pulmonary bifurcation
  tube(heart, [
    [hPos[0] + 0.025, hPos[1] + 0.09, hPos[2] + 0.02],
    [hPos[0] + 0.02, hPos[1] + 0.22, hPos[2] + 0.02],
    [hPos[0] - 0.03, hPos[1] + 0.24, hPos[2] - 0.03],
    [hPos[0] - 0.06, hPos[1] + 0.15, hPos[2] - 0.08]
  ], 0.036, {color:'#dc3952', roughness:0.32});

  // Branch 1: Brachiocephalic trunk (頭臂幹)
  tube(heart, [
    [hPos[0] + 0.005, hPos[1] + 0.23, hPos[2] + 0.005],
    [hPos[0] - 0.05, shoulder + 0.06, hPos[2] + 0.02],
    [-0.10, shoulder + 0.12, 0.04]
  ], 0.018, {color:'#e4465d'});
  // Branch 2: Left common carotid artery (左頸總動脈)
  tube(heart, [
    [hPos[0] - 0.015, hPos[1] + 0.24, hPos[2] - 0.01],
    [0.01, shoulder + 0.08, hPos[2] + 0.02],
    [0.03, shoulder + 0.15, 0.04]
  ], 0.015, {color:'#e4465d'});
  // Branch 3: Left subclavian artery (左鎖骨下動脈)
  tube(heart, [
    [hPos[0] - 0.035, hPos[1] + 0.24, hPos[2] - 0.03],
    [0.05, shoulder + 0.07, hPos[2] - 0.01],
    [0.16, shoulder + 0.05, 0.02]
  ], 0.015, {color:'#e4465d'});

  // Ligamentum arteriosum / Ductus arteriosus site (動脈導管位置示意)
  tube(heart, [
    [hPos[0] + 0.03, hPos[1] + 0.18, hPos[2] - 0.01],
    [hPos[0] - 0.02, hPos[1] + 0.21, hPos[2] - 0.03]
  ], 0.012, {color:'#df7888'});

  // Major Circulatory Vessels
  const vessels = add('主要循環走向（非完整血管樹）','heart');
  // Superior Vena Cava (SVC) entering Right Atrium
  tube(vessels, [
    [-0.08, shoulder + 0.08, 0.02],
    [hPos[0] - 0.08, cy + 0.16, hPos[2] - 0.03],
    [hPos[0] - 0.09, hPos[1] + 0.11, hPos[2] - 0.02]
  ], 0.030, {color:'#4c7cb8'});
  // Inferior Vena Cava (IVC)
  tube(vessels, [
    [hPos[0] - 0.08, hPos[1] + 0.04, hPos[2] - 0.05],
    [-0.07, diaphragmY - 0.10, -0.06],
    [-0.06, hip + 0.08, -0.04]
  ], 0.032, {color:'#4c7cb8'});
  // Descending Thoracic & Abdominal Aorta
  tube(vessels, [
    [hPos[0] - 0.06, hPos[1] + 0.15, hPos[2] - 0.08],
    [-0.03, cy - 0.12, -0.09],
    [-0.02, diaphragmY - 0.10, -0.08],
    [-0.02, hip + 0.08, -0.06]
  ], 0.030, {color:'#dc3952'});
  // Iliac branches to legs & arms
  for (const s of [-1, 1]) {
    tube(vessels, [[-0.02, hip + 0.08, -0.06], [s * 0.14, hip - 0.08, -0.02], [s * 0.22, 0.20, 0.035]], 0.018, {color:'#dc3952'});
    tube(vessels, [[s * 0.03, shoulder - 0.02, 0.06], [s * w * 0.94, shoulder - 0.12, 0.02], [s * (w + 0.24), hip + 0.35, 0.06]], 0.015, {color:'#dc3952'});
  }

  // 6. DIGESTIVE SYSTEM / 消化系統 (兒科巨大肝葉與鐮狀韌帶、J形胃、十二指腸C環、結腸袋大腸)
  const liver = add('肝臟','digest');
  // Pediatric liver is relatively very large, filling right hypochondrium and extending below costal margin
  const liverW = infant ? 0.30 : 0.27;
  const liverH = infant ? 0.13 : 0.11;
  const liverD = infant ? 0.21 : 0.18;
  const liverY = diaphragmY - 0.12;

  // Right Liver Lobe (Dominant anatomical wedge fitting under right diaphragm)
  const rLobe = ell(liver, [-0.13, liverY, 0.06], [liverW * 0.72, liverH, liverD], {color:'#8e4e37', roughness:0.35});
  rLobe.rotation.z = 0.14;
  rLobe.rotation.x = -0.10;
  // Left Liver Lobe (Extending past midline across stomach anterior)
  const lLobe = ell(liver, [0.07, liverY + 0.02, 0.07], [liverW * 0.50, liverH * 0.78, liverD * 0.75], {color:'#94543d', roughness:0.35});
  lLobe.rotation.z = -0.18;
  // Falciform ligament notch (鐮狀韌帶分葉切跡)
  tube(liver, [[-0.01, liverY + 0.11, 0.12], [-0.01, liverY - 0.02, 0.16]], 0.008, {color:'#6d3420'});
  // Gallbladder (膽囊底露出於肝下緣)
  ell(liver, [-0.09, liverY - 0.07, 0.12], [0.032, 0.065, 0.034], {color:'#497841', roughness:0.25});

  // Stomach (J-shaped: Fundus, Body, Greater/Lesser Curvature, Pylorus)
  const stomach = add('胃','digest');
  const stomY = diaphragmY - 0.16;
  // Fundus (胃底) - tucked under left diaphragm dome
  ell(stomach, [0.17, stomY + 0.07, 0.01], [0.082, 0.095, 0.080], {color:'#d2857d', roughness:0.36});
  // Gastric Body (胃體)
  const sBody = ell(stomach, [0.19, stomY - 0.02, 0.04], [0.095, 0.13, 0.085], {color:'#c97b73', roughness:0.36});
  sBody.rotation.z = -0.38;
  // Pyloric Antrum & Canal (幽門竇轉向右側)
  tube(stomach, [
    [0.18, stomY - 0.10, 0.05],
    [0.10, stomY - 0.13, 0.07],
    [0.02, stomY - 0.11, 0.06]
  ], 0.032, {color:'#c97b73', roughness:0.36});
  // Esophagus connecting to stomach cardia
  tube(stomach, [[0.02, shoulder - 0.08, -0.02], [0.04, cy - 0.10, -0.04], [0.12, stomY + 0.05, 0.00]], 0.024, {color:'#dca094', roughness:0.38});

  // Duodenum & Intestines (十二指腸 C 形環環繞胰臟頭部，結腸框與中央空迴腸)
  const intestine = add('小腸與大腸（走向示意）','digest');
  // Duodenal C-loop (十二指腸 C 形環)
  tube(intestine, [
    [0.02, stomY - 0.11, 0.06],   // Superior part
    [-0.04, stomY - 0.13, 0.05],  // Descending part
    [-0.03, stomY - 0.22, 0.04],  // Horizontal part
    [0.06, stomY - 0.20, 0.04]    // Ascending to duodenojejunal flexure
  ], 0.024, {color:'#d2a875', roughness:0.38});

  // Large Intestine frame (Cecum/Appendix, Ascending, Transverse, Descending, Sigmoid)
  tube(intestine, [
    [-0.22, hip + 0.03, 0.06],      // Cecum (盲腸)
    [-0.24, diaphragmY - 0.24, 0.03], // Ascending colon & hepatic flexure
    [-0.10, diaphragmY - 0.22, 0.14], // Transverse colon drooping anteriorly
    [0.14, diaphragmY - 0.23, 0.14],
    [0.24, diaphragmY - 0.25, 0.02],  // Splenic flexure
    [0.22, hip + 0.02, 0.04],        // Descending colon
    [0.12, hip - 0.06, 0.09],        // Sigmoid colon S-loop
    [0.00, hip - 0.14, 0.03]         // Rectum
  ], 0.034, {color:'#b88267', roughness:0.42});

  // Haustra bumps along colon (結腸袋節段特徵)
  const colonHaustra = [
    [-0.23, hip + 0.08, 0.05], [-0.24, diaphragmY - 0.32, 0.04],
    [-0.14, diaphragmY - 0.23, 0.13], [0.03, diaphragmY - 0.22, 0.15], [0.18, diaphragmY - 0.24, 0.10],
    [0.23, hip + 0.10, 0.04]
  ];
  for (const pos of colonHaustra) {
    ell(intestine, pos, [0.042, 0.036, 0.040], {color:'#be886c', roughness:0.42});
  }

  // Small Intestinal Loops (空腸與迴腸自然盤曲)
  const smLoops = [];
  const loopCount = 56;
  for (let i = 0; i < loopCount; i++) {
    const v = i / (loopCount - 1);
    const theta = v * Math.PI * 8.5;
    const rLoop = 0.14 * (0.8 + 0.25 * Math.sin(v * Math.PI * 3));
    smLoops.push([
      Math.sin(theta) * rLoop + (i % 2 === 0 ? 0.015 : -0.015),
      diaphragmY - 0.29 - v * Math.max(0.12, diaphragmY - hip - 0.27),
      0.11 + Math.cos(theta) * 0.024 + 0.03 * Math.sin(v * Math.PI)
    ]);
  }
  tube(intestine, smLoops, 0.020, {color:'#ddb488', roughness:0.35});

  // 7. URINARY SYSTEM / 泌尿系統 (蠶豆狀腎臟、腎門凹陷、輸尿管、充盈膀胱)
  for (const s of [-1, 1]) {
    const kidney = add(s === -1 ? '右腎與輸尿管' : '左腎與輸尿管', 'urinary');
    // Right kidney is lower than left due to liver
    const kY = diaphragmY - 0.19 + (s === 1 ? 0.032 : -0.015);
    const kx = s * 0.21;
    // Bean-shaped kidney with medial renal hilum (腎門凹陷)
    const km = ell(kidney, [kx, kY, -0.155], [0.080, 0.115, 0.068], {color:'#8e5f9e', roughness:0.34});
    km.rotation.z = s * -0.26;
    km.rotation.y = s * 0.15;
    // Sculpt renal hilum notch on medial surface
    const kp = km.geometry.attributes.position;
    for (let k = 0; k < kp.count; k++) {
      const x = kp.getX(k);
      const z = kp.getZ(k);
      if (s === -1 ? x > 0 : x < 0) { // Medial side
        kp.setX(k, x * 0.82);
        kp.setZ(k, z * 0.85);
      }
    }
    km.geometry.computeVertexNormals();

    // Renal pelvis & Ureter descending retroperitoneally into bladder
    tube(kidney, [
      [s * 0.16, kY, -0.145],
      [s * 0.13, hip + 0.14, -0.12],
      [s * 0.07, hip + 0.02, -0.03],
      [s * 0.04, hip - 0.04, 0.06]
    ], 0.012, {color:'#dec8ea', roughness:0.3});

    // 8. ADRENAL GLANDS / 腎上腺 (Cap-shaped on upper poles: Right pyramidal, Left crescent)
    const adrenal = add(s === -1 ? '右腎上腺' : '左腎上腺', 'endo');
    if (s === -1) {
      // Right Adrenal (Pyramidal cap)
      ell(adrenal, [kx, kY + 0.115, -0.15], [0.068, 0.035, 0.045], {color:'#e2b24b', roughness:0.4});
    } else {
      // Left Adrenal (Semilunar / crescent)
      ell(adrenal, [kx, kY + 0.120, -0.15], [0.074, 0.038, 0.040], {color:'#e2b24b', roughness:0.4});
    }
  }
  // Urinary Bladder (兒科膀胱在骨盆較淺、腹腔偏高，呈膨隆卵圓形)
  const bladder = add('膀胱與尿道（簡化）','urinary');
  ell(bladder, [0, hip - 0.03, 0.09], [0.095, 0.090, 0.082], {color:'#aa7dc4', roughness:0.32});
  tube(bladder, [[0, hip - 0.08, 0.085], [0, hip - 0.19, 0.075]], 0.015, {color:'#be98d4'}); // Urethra

  // 9. THYROID, THYMUS & SPLEEN / 內分泌與免疫
  // Thyroid (雙葉伴峽部峡帶)
  const thyroid = add('甲狀腺','endo');
  for (const s of [-1, 1]) {
    ell(thyroid, [s * 0.055, shoulder + 0.095, 0.075], [0.032, 0.055, 0.024], {color:'#dca44b', roughness:0.4});
  }
  tube(thyroid, [[-0.04, shoulder + 0.075, 0.08], [0.04, shoulder + 0.075, 0.08]], 0.016, {color:'#dca44b', roughness:0.4}); // Isthmus

  // Thymus (兒科特有發達胸腺，跨於心前胸骨後)
  const thymus = add('胸腺','immune');
  const thymScale = infant ? [0.085, 0.125, 0.042] : [0.055, 0.090, 0.032];
  for (const s of [-1, 1]) {
    const m = ell(thymus, [s * 0.065, shoulder - 0.18, 0.21], thymScale, {color:'#8ec68a', roughness:0.42});
    m.rotation.z = s * -0.22;
  }

  // Spleen (左上腹肋弓深處，具脾門與分葉特徵)
  const spleen = add('脾臟','immune');
  const sp = ell(spleen, [0.29, diaphragmY - 0.12, -0.04], [0.055, 0.095, 0.062], {color:'#7f5296', roughness:0.36});
  sp.rotation.z = -0.32;
  sp.rotation.y = 0.25;

  root.updateMatrixWorld(true);
  for (const i of items) i.base.copy(i.object.position);
  applyVisibility();
  renderKnowledge();
  fitVisible();
  ready = true;
}

function applyVisibility(){if(specimenMode||importedMode){items.forEach(i=>i.object.visible=true);updateLabels();return}for(const i of items){i.object.visible=topic==='all'?(i.system!=='muscle'):i.system===topic;const idx=topics.findIndex(t=>t.id===i.system);i.object.position.set(expanded?(idx%3-1)*1.05:0,expanded?-Math.floor((idx-1)/3)*.27:0,expanded?Math.floor((idx-1)/3)*.30:0);i.object.traverse(m=>{if(!m.isMesh)return;const base=topic==='all'?(i.system==='skin'?.09:i.system==='bone'?.38:1):i.system==='skin'?.55:1;if(!m.material.wireframe){m.material.opacity=base;m.material.transparent=base<1;m.material.depthWrite=base>=1;}m.material.emissive.set(0)})}root.updateMatrixWorld(true);updateLabels();$('#canvas-host .model-empty')?.remove();if(topic==='repro'){const n=document.createElement('div');n.className='model-empty';n.textContent='本主題提供文字教學，目前沒有兒科生殖器官 3D 模型。請閱讀教學面板。';host.append(n)}$('#explode').disabled=topic!=='all';}
function fit(box){if(!controls||box.isEmpty())return;controls.update();const c=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());const dist=Math.max(size.y,size.x/camera.aspect)*.5/Math.tan(T.MathUtils.degToRad(camera.fov/2))*1.30+size.z*.5;controls.target.copy(c);camera.position.copy(c).add(new T.Vector3(0,0,Math.max(.3,dist)));controls.update()}
function fitVisible(){if(!root)return;const b=new T.Box3();for(const i of items)if(i.object.visible)b.union(new T.Box3().setFromObject(i.object));fit(b)}
function updateSelectedCard(){
  const selEl=$('#selected');
  if(!selEl)return;
  if(specimenMode){
    selEl.innerHTML=`<div class="sys-func-title"><span class="sys-badge" style="background:#264c45;border-color:#8cd3bf"><i style="background:#9be6d2"></i>來源模型</span>13 個月幼兒顱骨 · NIH 3D</div><p class="sys-func-text">Nevit Dilmen CC BY-SA 來源網格。提供真實兒科開放顱縫與顱頂幾何觀察，可旋轉放大檢視。</p>`;
    return;
  }
  if(importedMode){
    if(selected){
      selEl.innerHTML=`<div class="sys-func-title"><span class="sys-badge" style="background:#264c45;border-color:#8cd3bf"><i style="background:#a3decf"></i>本機構造</span>${escapeHTML(selected.name)}</div><p class="sys-func-text">已選取本機分件。可於右側編輯教學標籤、調整不透明度或單獨放大觀察。</p>`;
    }else{
      selEl.innerHTML=`<div class="sys-func-title"><span class="sys-badge" style="background:#264c45;border-color:#8cd3bf"><i style="background:#a3decf"></i>本機模型</span>${escapeHTML(importedState?.metadata?.title||'我的模型教學包')}</div><p class="sys-func-text">點選 3D 構造可查看分件；分件名稱由來源提供。畫面不提供實際尺度量測。</p>`;
    }
    return;
  }
  const curTopic=topicOf(topic);
  const sysCol=curTopic?.color||'#a3decf';
  const sysName=curTopic?.name||'解剖系統';
  const sysFunc=curTopic?.function||curTopic?.intro||'';
  if(selected){
    const organSys=topicOf(selected.system);
    const badgeCol=organSys?.color||sysCol;
    const badgeName=organSys?.name||sysName;
    const organFunc=organSys?.function||sysFunc;
    selEl.innerHTML=`<div class="sys-func-title"><span class="sys-badge" style="background:rgba(38,76,69,0.7);border-color:${badgeCol}"><i style="background:${badgeCol}"></i>${badgeName}</span><strong>${escapeHTML(selected.name)}</strong><span class="organ-selected-hint">點選器官中</span></div><p class="sys-func-text">${organFunc}</p>`;
  }else{
    selEl.innerHTML=`<div class="sys-func-title"><span class="sys-badge" style="background:rgba(38,76,69,0.7);border-color:${sysCol}"><i style="background:${sysCol}"></i>${sysName}</span>系統功用與生理任務</div><p class="sys-func-text">${sysFunc}</p>`;
  }
}
function choose(i){
  selected=i;
  for(const it of items)it.object.traverse(m=>{if(m.isMesh)for(const material of (Array.isArray(m.material)?m.material:[m.material]))material.emissive?.set(it===i?'#24594f':readableMode?'#25181b':'#000000')});
  updateSelectedCard();
  if($('#organ'))$('#organ').value=i?.id||'';
  if($('#focus'))$('#focus').disabled=!i;
  if(importedMode&&$('#part-select')){$('#part-select').value=i?.id||'';$('#part-label').value=i?.name||'';$('#part-label').disabled=!i;}
}
function setTopic(id){
  if(specimenMode||importedMode){topic=id;buildModel()}
  topic=id;
  selected=null;
  expanded=false;
  $('#explode').setAttribute('aria-pressed','false');
  $('#explode').textContent='展開';
  document.querySelectorAll('[data-topic]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.topic===id));
  if(root)applyVisibility();
  renderKnowledge();
  choose(null);
  fitVisible();
  $('#panel').scrollTop=0;
}
$('#systems').onclick=e=>{const b=e.target.closest('[data-topic]');if(b)setTopic(b.dataset.topic)};
document.querySelectorAll('[data-age]').forEach(b=>b.onclick=()=>{age=b.dataset.age;document.querySelectorAll('[data-age]').forEach(x=>x.setAttribute('aria-pressed',x===b));expanded=false;$('#explode').setAttribute('aria-pressed','false');$('#explode').textContent='展開';if(root)buildModel();else renderKnowledge();choose(null)});
$('#panel-toggle').onclick=()=>{const hide=$('.workspace').classList.toggle('panel-hidden');$('#panel-toggle').textContent=hide?'顯示教學':'收起教學';$('#panel-toggle').setAttribute('aria-expanded',!hide)};
function setDrag(v){dragMode=v;$('#pan').setAttribute('aria-pressed',v==='pan');$('#rotate').setAttribute('aria-pressed',v==='rotate');$('.help').textContent=v==='pan'?'拖曳平移 · 右鍵旋轉 · 滾輪縮放 · 觸控雙指縮放':'拖曳旋轉 · 右鍵平移 · 滾輪縮放 · 觸控雙指縮放';if(!controls)return;controls.mouseButtons.LEFT=v==='pan'?T.MOUSE.PAN:T.MOUSE.ROTATE;controls.mouseButtons.RIGHT=v==='pan'?T.MOUSE.ROTATE:T.MOUSE.PAN;controls.touches.ONE=v==='pan'?T.TOUCH.PAN:T.TOUCH.ROTATE;controls.touches.TWO=v==='pan'?T.TOUCH.DOLLY_ROTATE:T.TOUCH.DOLLY_PAN;renderer.domElement.style.cursor=v==='pan'?'move':'grab'}
function setClarity(enabled){setSurfacePresentation(root,'atlas');readableMode=enabled;setReadableMaterial(root,enabled);$('#readable-material').setAttribute('aria-pressed',enabled);if(importedMode&&$('#part-opacity'))$('#part-opacity').oninput({target:{value:String(importOpacity)}});setSurfacePresentation(root,surfaceStyle);choose(selected);}
$('#readable-material').onclick=()=>{if(root)setClarity(!readableMode)};
$('#surface-style').onclick=()=>{if(!root)return;surfaceStyle=surfaceStyle==='atlas'?'specimen':'atlas';setSurfacePresentation(root,surfaceStyle);$('#surface-style').setAttribute('aria-pressed',surfaceStyle==='specimen');$('#surface-style').textContent=surfaceStyle==='specimen'?'返回系統配色':'灰白標本'};
$('#pan').onclick=()=>setDrag('pan');$('#rotate').onclick=()=>setDrag('rotate');$('#reset').onclick=fitVisible;$('#top-view').onclick=()=>{fitVisible();if(camera){const d=camera.position.distanceTo(controls.target);camera.position.copy(controls.target).add(new T.Vector3(0,d,.001));controls.update()}};$('#back').onclick=()=>{fitVisible();if(camera){const d=camera.position.z-controls.target.z;camera.position.z=controls.target.z-d;controls.update()}};
function zoom(f){if(!camera)return;const off=camera.position.clone().sub(controls.target);off.setLength(T.MathUtils.clamp(off.length()*f,.12,35));camera.position.copy(controls.target).add(off);controls.update()}
$('#zoom-in').onclick=()=>zoom(.8);$('#zoom-out').onclick=()=>zoom(1.25);$('#explode').onclick=()=>{expanded=!expanded;$('#explode').setAttribute('aria-pressed',expanded);$('#explode').textContent=expanded?'組合':'展開';choose(null);applyVisibility();fitVisible()};$('#label-toggle').onclick=()=>{labelsOn=!labelsOn;$('#label-toggle').setAttribute('aria-pressed',labelsOn);$('#labels').hidden=!labelsOn};
let labelItems=[];
function updateLabels(){if(specimenMode||importedMode){labelItems=[];$('#labels').innerHTML='';return}const shown=items.filter(i=>i.object.visible&&i.system!=='skin'&&i.system!=='bone');labelItems=(topic==='all'?shown.filter(i=>['大腦（腦回簡化）','心臟（外形示意）','肝臟','左肺（外形示意）','小腸與大腸（走向示意）'].includes(i.name)):shown).slice(0,7);$('#labels').innerHTML=labelItems.map(i=>`<span>${i.name.replace(/（.*）/,'')}</span>`).join('')}
function drawLabels(){if(!labelsOn)return;const labels=labelItems.map((i,j)=>{const p=new T.Box3().setFromObject(i.object).getCenter(new T.Vector3()).project(camera);return{n:$('#labels').children[j],p,y:(-p.y*.5+.5)*host.clientHeight-10}}).sort((a,b)=>a.y-b.y);let lastY=-30;for(const {n,p,y} of labels){n.hidden=p.z>1||p.z< -1;const yy=Math.max(lastY+26,Math.min(host.clientHeight-28,y));lastY=yy;const x=Math.max(4,Math.min(host.clientWidth-n.offsetWidth-4,(p.x*.5+.5)*host.clientWidth+16));n.style.transform=`translate(${x}px,${yy}px)`}}


function renderSpecimenKnowledge(){
 $('#age-label').textContent='SOURCE MODEL / 13 個月幼兒';$('#scene-title').textContent='幼兒顱骨 · 來源模型';$('#number').textContent='01 / 來源';
 $('#knowledge').innerHTML=`<span class="topic-en">BABY CRANIUM · 3DPX-003169</span><h2>13 個月幼兒顱骨</h2><div class="active-age"><div class="section-label">已替換為來源網格</div><p>作者 Nevit Dilmen（nevitdilmen），由 NIH 3D 收錄。來源描述為「13 個月幼兒、顱縫開放的顱骨」。本檢視保留原始形狀，沒有套用成人模型或任意改變頭身比例。</p></div><p class="coverage">這是 13 個月幼兒的單件顱骨，不能當成 6 個月嬰兒、6 歲兒童或新生兒的標準模型。NIH 收錄不等於 NIH 對個別模型作醫學認證；來源未明確交代正常／病理判讀與影像取得方法。</p><h3>如何觀察</h3><p>先用正面觀察眼眶與顏面骨，再按「頂面」查看顱頂和顱縫；「背面」查看後方。可自由平移、旋轉、縮放。模型是一個完整網格，沒有逐塊骨頭的標記或分割。</p><div class="focus-row"><button id="source-fit">完整顯示顱骨</button><button id="return-schematic">返回全身示意</button></div><h3>保留的資料</h3><p>約 66 萬個三角面。原始 GLB 檔完整保存；顯示時只作旋轉、置中、等比縮放及材質改色，未平滑、簡化或補洞。畫面尺寸不可作實際長度量測。</p><details open><summary>作者、來源與授權</summary><ul class="source-list"><li><a href="https://3d.nih.gov/entries/3DPX-003169?version=2" target="_blank" rel="noopener">Baby cranium · nevitdilmen · NIH 3D · Version 2</a></li><li><a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">Creative Commons 姓名標示—相同方式分享 4.0</a></li></ul><p class="coverage">個人離線使用；未上傳網站。若日後分享模型或改作，需保留作者、來源、授權與修改說明，並遵守相同方式分享條件。</p></details><h3>逐步更新狀態</h3><p>✓ 已完成：13 個月顱骨來源模型<br>待確認：年齡明確、正常與病理分開的兒科心臟<br>待取得：嬰兒／兒童氣道、胸廓與全身模型</p>`;
 $('#source-fit').onclick=fitVisible;$('#return-schematic').onclick=()=>setTopic('all');
}
async function loadSkull(){
 const serial=++loadSerial;importedMode=false;$('#show-imported').setAttribute('aria-pressed','false');specimenMode=true;ready=false;expanded=false;topic='bone';dispose();$('#canvas-host .model-empty')?.remove();document.querySelectorAll('[data-topic],[data-age]').forEach(b=>b.setAttribute('aria-pressed','false'));$('#source-skull').setAttribute('aria-pressed','true');$('#explode').disabled=true;$('#explode').setAttribute('aria-pressed','false');$('#explode').textContent='展開';$('.stage-note').innerHTML='<span class="dot"></span>NIH 3D 來源網格 · 13 個月 · 非全身年齡模型';$('#selected').textContent='正在載入來源顱骨…';renderSpecimenKnowledge();
 try{
 const raw=atob(skullAsset.split(',')[1]);const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer,'');
 if(serial!==loadSerial){gltf.scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});return}
 const item=add('13 個月幼兒顱骨 · NIH 3D','bone');item.object.add(gltf.scene);gltf.scene.rotation.x=-Math.PI/2;
 gltf.scene.traverse(o=>{if(o.isMesh){o.material?.dispose();o.material=new T.MeshStandardMaterial({color:'#e3d9c5',roughness:.72,side:T.DoubleSide});o.userData.item=item}});
 root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(gltf.scene);const center=box.getCenter(new T.Vector3());gltf.scene.position.sub(center);item.object.scale.setScalar(3/box.getSize(new T.Vector3()).y);root.updateMatrixWorld(true);updateLabels();fitVisible();choose(null);$('#selected').textContent='13 個月顱骨 · 可自由拖曳與查看顱縫';ready=true;
 }catch(error){if(serial!==loadSerial)return;$('#selected').textContent='來源模型載入失敗；可點年齡按鈕返回示意版。';console.error(error)}
}
$('#source-skull').onclick=loadSkull;
function renderImportedKnowledge(){
 const m=importedState.metadata;
 $('#age-label').textContent='LOCAL MODEL / 本機匯入';$('#scene-title').textContent=m.title||importedState.entry;$('#number').textContent='本機';
 $('#knowledge').innerHTML=`<h2>我的模型教學包</h2><p class="coverage">保留原模型形狀與分件，僅置中及等比縮放。預設使用淺粉色清晰材質；按下方「清晰材質」可切回原色。顏色只為便於觀察，不代表組織真實顏色。分件名稱由來源提供，尚未核對；單一網格不能自動分離器官。畫面不提供實際尺度量測。</p><label>選取構造<select id="part-select"><option value="">請選擇</option>${items.map(i=>`<option value="${i.id}">${escapeHTML(i.name)}</option>`).join('')}</select></label><label>教學標籤<input id="part-label" disabled maxlength="150"></label><div class="focus-row"><button id="part-solo">單獨放大</button><button id="part-all">全部顯示</button></div><details><summary>逐件顯示／隱藏（${items.length} 件）</summary><div class="part-list">${items.map(i=>`<label><input type="checkbox" data-part="${i.id}" ${i.object.visible?'checked':''}> <span>${escapeHTML(i.name)}</span></label>`).join('')}</div></details><label>模型不透明度<input id="part-opacity" type="range" min="10" max="100" value="${importOpacity}"></label><details open><summary>來源與教學資料</summary>${[['title','模型名稱'],['age','來源年齡（未知請留白）'],['source','來源網址／文獻'],['author','作者'],['license','授權']].map(([key,label])=>`<label>${label}<input data-meta="${key}" maxlength="500" value="${escapeHTML(m[key])}"></label>`).join('')}<label>正常／病理（依來源記載）<select data-meta="status">${[['unknown','未確認'],['normal','來源標示正常'],['pathology','來源標示病理']].map(([k,v])=>`<option value="${k}" ${m.status===k?'selected':''}>${v}</option>`).join('')}</select></label><label>教學筆記<textarea data-meta="notes" maxlength="4000">${escapeHTML(m.notes)}</textarea></label></details><label>搭配教學主題<select id="import-topic"><option value="">尚未指定</option>${topics.map(t=>`<option value="${t.id}" ${m.topic===t.id?'selected':''}>${t.name}</option>`).join('')}</select></label><div id="import-lesson"></div><button id="save-package">儲存模型教學包</button><p class="coverage">儲存包含原始模型、來源資料與標籤；不包含鏡頭、透明度或隱藏狀態。關閉前請儲存，下次用「匯入本機模型」重開 .anatomy.json。</p>`;
 const lesson=()=>{const t=topicOf(m.topic);$('#import-lesson').innerHTML=t?`<h3>${t.name} · 教學文字</h3><p>${t.intro}</p><p><strong>嬰兒：</strong>${t.infant}</p><p><strong>兒童：</strong>${t.child}</p><p>${t.point}</p><p class="coverage">文字是既有通則，不代表本次匯入模型的年齡或診斷；模型方位依原檔，不自動判定解剖左右。</p><details><summary>教學資料來源</summary>${refs(t.refs)}</details>`:''};lesson();$('#import-topic').onchange=e=>{m.topic=e.target.value;lesson()};
 $('#part-select').onchange=e=>choose(items.find(i=>i.id===e.target.value)||null);
 $('#part-label').onchange=e=>{if(!selected)return;selected.name=e.target.value.trim()||selected.originalName;importedState.labels[selected.importKey]=selected.name;renderImportedKnowledge();choose(selected)};
 $('#part-solo').onclick=()=>{if(!selected){$('#selected').textContent='請先選擇構造';return}items.forEach(i=>i.object.visible=i===selected);syncParts();fitVisible()};
 $('#part-all').onclick=()=>{items.forEach(i=>i.object.visible=true);syncParts();fitVisible()};
 document.querySelectorAll('[data-part]').forEach(b=>b.onchange=()=>{const i=items.find(i=>i.id===b.dataset.part);i.object.visible=b.checked;if(!b.checked&&selected===i)choose(null)});
 $('#part-opacity').oninput=e=>{importOpacity=Number(e.target.value);items.forEach(i=>i.object.traverse(o=>{if(o.isMesh)for(const m of (Array.isArray(o.material)?o.material:[o.material])){m.opacity=Number(e.target.value)/100;m.transparent=m.opacity<1;m.depthWrite=m.opacity>=1;m.needsUpdate=true}}));};
 document.querySelectorAll('[data-meta]').forEach(el=>el.oninput=()=>{m[el.dataset.meta]=el.value;if(el.dataset.meta==='title')$('#scene-title').textContent=el.value||importedState.entry});
 $('#save-package').onclick=()=>{try{const url=URL.createObjectURL(new Blob([packBundle(importedState,m,importedState.labels)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='模型教學包.anatomy.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);$('#import-status').textContent='已交給瀏覽器下載，請確認檔案已儲存。'}catch(e){$('#import-status').textContent=e.message}};
}
function syncParts(){document.querySelectorAll('[data-part]').forEach(b=>b.checked=items.find(i=>i.id===b.dataset.part).object.visible)}
async function importLocal(input){
 if(!root)return;
 const serial=loadSerial,ticket=++importSerial;$('#import-status').textContent='正在讀取本機模型…';$('#import-model').disabled=true;
 try{
 const state=Array.isArray(input)?await readFiles(input):input;
 const result=await parseModel(state);if(serial!==loadSerial||ticket!==importSerial){disposeObject(result.object);if(ticket===importSerial)$('#import-status').textContent='已取消匯入：檢視已切換。';return}
 const source=result.object;source.updateMatrixWorld(true);const meshes=[];source.traverse(o=>{if(o.isMesh)meshes.push(o)});
 const box=new T.Box3().setFromObject(source),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),scale=3/Math.max(size.x,size.y,size.z);
 const prepared=meshes.map((mesh,index)=>{const g=mesh.geometry.clone();const materials=(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(m=>m.clone());const copy=new T.Mesh(g,Array.isArray(mesh.material)?materials:materials[0]);copy.matrixAutoUpdate=false;copy.matrix.makeScale(scale,scale,scale).multiply(new T.Matrix4().makeTranslation(-center.x,-center.y,-center.z)).multiply(mesh.matrixWorld);return {mesh:copy,name:mesh.name||`未命名構造 ${index+1}`}});
 // Cloned materials retain source textures; transfer ownership to the displayed meshes.
 const gs=new Set(),ms=new Set();source.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m)ms.add(m)});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());
 ++loadSerial;dispose();importOpacity=100;importedState=state;importedMode=true;specimenMode=false;expanded=false;
 prepared.forEach((p,index)=>{const key='mesh-'+index,item=add(String(state.labels[key]||p.name).slice(0,150),'imported');item.originalName=p.name;item.importKey=key;item.object.add(p.mesh);p.mesh.userData.item=item});
 document.querySelectorAll('[data-topic],[data-age],#source-skull').forEach(b=>b.setAttribute('aria-pressed','false'));$('#show-imported').disabled=false;$('#show-imported').setAttribute('aria-pressed','true');$('#explode').disabled=true;$('#explode').setAttribute('aria-pressed','false');$('#explode').textContent='展開';$('#canvas-host .model-empty')?.remove();$('.stage-note').textContent='本機匯入 · 年齡與正常／病理狀態依來源記錄 · 尚未醫學核對';
 updateLabels();renderKnowledge();setClarity(true);fitVisible();choose(null);ready=true;$('#import-status').textContent=`已載入 ${result.meshes} 件、${Math.round(result.triangles).toLocaleString()} 個三角面。`;
 }catch(error){if(serial===loadSerial&&ticket===importSerial)$('#import-status').textContent='無法匯入：'+error.message}
 finally{if(ticket===importSerial)$('#import-model').disabled=false}
}
$('#import-model').onclick=()=>$('#model-files').click();
$('#model-files').onchange=e=>{const files=Array.from(e.target.files);e.target.value='';if(files.length)importLocal(files)};
$('#show-imported').onclick=()=>{if(importedState)importLocal(importedState)};

renderKnowledge();
try{renderer=new T.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.45;host.prepend(renderer.domElement);scene=new T.Scene();root=new T.Group();scene.add(root);camera=new T.PerspectiveCamera(34,1,.01,100);camera.position.set(0,2,7);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.screenSpacePanning=true;controls.zoomToCursor=true;controls.minDistance=.12;controls.maxDistance=35;setDrag('pan');setupMedicalLighting(T,renderer,scene,camera);
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};new ResizeObserver(resize).observe(host);resize();
 let down=null,moved=false;const active=new Set();renderer.domElement.addEventListener('pointerdown',e=>{active.add(e.pointerId);if(active.size>1)moved=true;else{down=[e.clientX,e.clientY];moved=false}});renderer.domElement.addEventListener('pointermove',e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)moved=true});renderer.domElement.addEventListener('pointercancel',e=>{active.delete(e.pointerId);down=null;moved=true});renderer.domElement.addEventListener('pointerup',e=>{active.delete(e.pointerId);if(e.button!==0||moved||!down||active.size)return;const rect=renderer.domElement.getBoundingClientRect(),pointer=new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),ray=new T.Raycaster();ray.setFromCamera(pointer,camera);const hits=ray.intersectObjects(items.filter(i=>i.object.visible&&(topic==='skin'||i.system!=='skin')).map(i=>i.object),true);choose(hits[0]?.object.userData.item||null);down=null});
 buildModel();$('#loading').remove();renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);drawLabels()});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#selected').textContent='3D 顯示已中斷，請重新開啟頁面；教學文字仍可閱讀。'});
 window.pediatricDiagnostics=()=>({importedMode,specimenMode,sourceId:specimenMode?'3DPX-003169':null,triangles:renderer.info.render.triangles,ready,age,topic,dragMode,expanded,count:items.length,visible:items.filter(i=>i.object.visible).length,selected:selected?.name,camera:camera.position.toArray(),target:controls.target.toArray(),bounds:new T.Box3().setFromObject(root).getSize(new T.Vector3()).toArray()});
 loadSkull();
}catch(error){console.error(error);$('#loading')?.remove();const n=document.createElement('div');n.className='error';n.setAttribute('role','alert');n.textContent='無法啟動 3D。請以支援 WebGL 的新版 Chrome／Edge 開啟，並確認硬體加速。右側教學文字仍可閱讀。';host.append(n);document.querySelectorAll('.toolbar button,#source-skull,#import-model,#show-imported').forEach(b=>b.disabled=true)}
