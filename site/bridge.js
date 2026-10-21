// Both trusted classrooms live in srcdoc; pause the hidden classroom without losing state.
(()=>{
 const schedule=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window);
 let active=true,serial=0;const pending=new Map();
 function enqueue(id,record){record.native=schedule(time=>{record.native=null;if(!active)return;pending.delete(id);record.callback(time)})}
 window.requestAnimationFrame=callback=>{const id=++serial,record={callback,native:null};pending.set(id,record);if(active)enqueue(id,record);return id};
 window.cancelAnimationFrame=id=>{const record=pending.get(id);if(record?.native!=null)cancel(record.native);pending.delete(id)};
 window.addEventListener('message',event=>{if(event.source!==parent||event.data?.type!=='anatomy-classroom-visibility')return;const next=event.data.active===true;if(active===next)return;active=next;for(const [id,record] of pending){if(active)enqueue(id,record);else if(record.native!=null){cancel(record.native);record.native=null}}});
})();
