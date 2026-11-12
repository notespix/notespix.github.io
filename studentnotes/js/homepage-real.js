(() => {
  const grid=document.getElementById("resourceGrid"), subjectsEl=document.getElementById("homeSubjectList");
  const levelsEl=document.getElementById("homeLevelList"), form=document.getElementById("resourceSearch");
  const searchInput=document.getElementById("searchInput"), formatSelect=document.getElementById("categoryFilter");
  const educationFilter=document.getElementById("homeEducationFilter"), empty=document.getElementById("emptyState");
  const loading=document.getElementById("homeResourcesLoading"), subjectLoading=document.getElementById("homeSubjectsLoading");
  if(!grid||!form)return;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt=v=>{const f=String(v||"").toUpperCase().replace(/\s+/g,"");return ["DOC","DOCX"].includes(f)?"DOC":["PPT","PPTX","POWERPOINT"].includes(f)?"PPT":f};
  let resources=[];
  function card(r){const href=`resource-details.html?id=${encodeURIComponent(r.id)}`;return `<article class="resource-card home-live-card"><div class="resource-card-top"><span class="resource-icon resource-icon-blue">▤</span><span class="card-arrow">↗</span></div><span class="resource-tag tag-blue">${esc(r.format||"FILE")} · ${esc(r.academic_level||"General")}</span><h3>${esc(r.title||"Untitled resource")}</h3><p>${esc(r.subject||"General subject")}${r.unit_topic?" · "+esc(r.unit_topic):""}</p><div class="card-footer"><span>${esc(r.education_level==="school"?"School":"College")} · ${esc(r.academic_level||"")}</span><a href="${href}">View <span>→</span></a></div></article>`;}
  function renderResources(){
    const q=(searchInput?.value||"").trim().toLowerCase(), fmtValue=formatSelect?.value||"all", edu=educationFilter?.value||"all";
    const list=resources.filter(r=>`${r.title||""} ${r.subject||""} ${r.description||""} ${r.format||""} ${r.academic_level||""} ${r.semester||""} ${r.unit_topic||""}`.toLowerCase().includes(q)&& (fmtValue==="all"||fmt(r.format)===fmtValue)&&(edu==="all"||(r.education_level||"")===edu));
    grid.innerHTML=list.slice(0,4).map(card).join(""); if(loading)loading.hidden=true;
    if(empty){empty.hidden=list.length>0;empty.textContent=resources.length?"No resources match those filters. Try another search.":"No resources published yet. Be the first to share useful study material.";}
    grid.hidden=list.length===0;
  }
  function renderSubjects(){
    const map=new Map(); resources.forEach(r=>{const s=(r.subject||"").trim();if(s)map.set(s,(map.get(s)||0)+1);});
    if(subjectLoading)subjectLoading.hidden=true;
    if(!subjectsEl)return;
    const names=[...map].sort((a,b)=>a[0].localeCompare(b[0]));
    subjectsEl.innerHTML=names.length?names.slice(0,8).map(([name,count])=>`<a href="explore.html?q=${encodeURIComponent(name)}" class="subject-pill"><span class="subject-emoji">${esc(name.trim().charAt(0).toUpperCase() || "#")}</span><span>${esc(name)}</span><small>${count}</small><span class="subject-arrow">↗</span></a>`).join(""):'<p class="home-subject-empty">Subjects will appear here as students publish resources.</p>';
  }
  function renderLevels(){
    if(!levelsEl)return;
    const map=new Map();resources.forEach(r=>{if(!r.academic_level)return;const key=`${r.education_level||"other"}|${r.academic_level}`;map.set(key,(map.get(key)||0)+1);});
    const entries=[...map].sort((a,b)=>a[0].localeCompare(b[0]));
    levelsEl.innerHTML=entries.length?entries.slice(0,8).map(([key,count])=>{const [type,label]=key.split("|");return `<a class="level-card" href="explore.html?education=${encodeURIComponent(type)}&level=${encodeURIComponent(label)}"><span class="level-card-icon">${type==="school"?"S":"C"}</span><span><strong>${esc(label)}</strong><small>${type==="school"?"School":"College / University"}</small></span><b>${count}</b></a>`;}).join(""):'<p class="home-level-empty">Classes and college years will appear here when students upload classified resources.</p>';
  }
  async function load(){
    try{
      let sb=window.notesPixSupabaseClient;
      if(!sb){if(!window.supabase?.createClient||!window.NOTESPIX_SUPABASE_URL||!window.NOTESPIX_SUPABASE_PUBLISHABLE_KEY)throw Error("NotesPix could not connect. Please refresh the page.");sb=window.supabase.createClient(window.NOTESPIX_SUPABASE_URL,window.NOTESPIX_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});window.notesPixSupabaseClient=sb;}
      const {data,error}=await sb.from("resources").select("id,title,description,subject,format,created_at,education_level,academic_level,semester,unit_topic").order("created_at",{ascending:false}).limit(200);
      if(error)throw error;resources=data||[];renderResources();renderSubjects();renderLevels();
    }catch(e){console.error("Homepage classified resources failed:",e);if(loading)loading.textContent="Resources could not load. Please refresh.";if(subjectLoading)subjectLoading.textContent="Subjects unavailable.";if(levelsEl)levelsEl.innerHTML='<p class="home-level-empty">Classification is temporarily unavailable.</p>';if(empty){empty.hidden=false;empty.textContent="We couldn't load resources right now. Please refresh and try again.";}}
  }
  form.addEventListener("submit",e=>{e.preventDefault();const p=new URLSearchParams();if(searchInput?.value.trim())p.set("q",searchInput.value.trim());if(formatSelect?.value&&formatSelect.value!=="all")p.set("format",formatSelect.value);if(educationFilter?.value&&educationFilter.value!=="all")p.set("education",educationFilter.value);location.href=`explore.html${p.toString()?"?"+p:""}`;});
  searchInput?.addEventListener("input",renderResources);formatSelect?.addEventListener("change",renderResources);educationFilter?.addEventListener("change",renderResources);load();
})();