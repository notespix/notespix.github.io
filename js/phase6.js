// Shared Phase 6 local demo data. This is browser-only, not server storage.
(() => {
 const KEY={saved:'studyhub-saved-resources',activity:'studyhub-activity',uploads:'studyhub-demo-uploads'};
 const read=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch(_){return []}};
 const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
 const addActivity=(type,title,icon)=>{const items=read(KEY.activity);items.unshift({id:Date.now()+Math.random(),type,title,icon:icon||'•',at:new Date().toISOString()});write(KEY.activity,items.slice(0,100));};
 const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const empty=(icon,title,copy,cta,href)=>`<div class="phase6-empty"><div class="phase6-empty-icon">${icon}</div><h3>${title}</h3><p>${copy}</p>${cta?`<a class="button button-primary" href="${href}">${cta}</a>`:''}<p class="muted-note">Your data is saved only in this browser for this frontend demo.</p></div>`;
 const toast=(msg)=>{const el=document.getElementById('phase6Toast');if(!el)return;el.textContent=msg;el.classList.add('visible');setTimeout(()=>el.classList.remove('visible'),2600)};
 window.StudyHubPhase6={KEY,read,write,addActivity,esc,empty,toast};
})();
