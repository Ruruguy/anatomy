(()=>{
 const payload=JSON.parse(document.getElementById('classroom-data').textContent);
 const frames=new Map(),tabs=Array.from(document.querySelectorAll('[data-room]'));
 let current='adult';
 const names={adult:'成人解剖 · 全身與右上肢',pediatric:'兒童與嬰兒 · 請在教室內選擇年齡或來源模型'};
 function notify(frame,active){frame.contentWindow?.postMessage({type:'anatomy-classroom-visibility',active},'*')}
 function select(room){
  if(!Object.hasOwn(payload,room))return;current=room;
  let frame=frames.get(room);
  if(!frame){frame=document.createElement('iframe');frame.id='room-'+room;frame.title=names[room];frame.setAttribute('role','tabpanel');frame.setAttribute('aria-labelledby','tab-'+room);frame.onload=()=>{notify(frame,current===room);if(current===room)document.getElementById('status').textContent=names[room]};frames.set(room,frame);if(typeof payload[room]==='string')frame.srcdoc=payload[room];else frame.src=payload[room].src;document.querySelector('main').appendChild(frame)}
  for(const [key,f] of frames){const visible=key===room;f.dataset.hidden=String(!visible);f.setAttribute('aria-hidden',String(!visible));f.inert=!visible;f.tabIndex=visible?0:-1;notify(f,visible)}
  tabs.forEach(tab=>{const selected=tab.dataset.room===room;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1});
  document.getElementById('status').textContent=names[room];document.getElementById('welcome').hidden=true;
 }
 tabs.forEach((tab,index)=>{tab.onclick=()=>select(tab.dataset.room);tab.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const i=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length;tabs[i].focus();select(tabs[i].dataset.room)}});
 const help=document.getElementById('help');document.getElementById('about').onclick=()=>help.showModal();document.getElementById('close-help').onclick=()=>help.close();
 select('adult');
})();
