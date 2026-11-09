(() => {
  const grid = document.getElementById("resourceGrid");
  if (!grid) return;
  const getCards = () => Array.from(grid.querySelectorAll(".explore-resource-card"));
  const search = document.getElementById("resourceSearch");
  const form = document.getElementById("resourceSearchForm");
  const sort = document.getElementById("sortResources");
  const count = document.getElementById("resultsCount");
  const noResults = document.getElementById("noResults");
  const activeFilters = document.getElementById("activeFilters");
  let quickButtons = [];
  const toast = document.getElementById("phase3Toast");
  let toastTimer;
  const chosen = { subject: new Set(), type: new Set(), format: new Set() };
  const params = new URLSearchParams(window.location.search);
  const incomingEducation = params.get('education');
  const incomingLevel = params.get('level');
  const subjectList = document.getElementById("subjectFilterList");
  const subjectSearch = document.getElementById("subjectFilterSearch");
  const subjectTotal = document.getElementById("subjectTotal");
  const toggleSubjects = document.getElementById("toggleAllSubjects");
  const noSubjectMatches = document.getElementById("noSubjectMatches");
  const popularSubjectFilters = document.getElementById("popularSubjectFilters");
  const popularSubjectList = document.getElementById("popularSubjectList");
  let allSubjects = [];
  let showAllSubjects = false;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2800);
  }
  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }
  function subjectKey(value) {
    return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  }
  function renderSubjectOptions() {
    if (!subjectList) return;
    const term = (subjectSearch?.value || "").trim().toLocaleLowerCase();
    const filtered = allSubjects.filter(item => item.name.toLocaleLowerCase().includes(term));
    const visible = term || showAllSubjects ? filtered : filtered.slice(0, 5);
    subjectList.innerHTML = visible.map(item => {
      const checked = chosen.subject.has(item.name) ? " checked" : "";
      return `<label class="filter-check"><input type="checkbox" name="subject" value="${escapeHtml(item.name)}"${checked}><span>${escapeHtml(item.name)}</span><small>${item.count}</small></label>`;
    }).join("");
    if (!visible.length) subjectList.innerHTML = "";
    if (noSubjectMatches) noSubjectMatches.hidden = visible.length !== 0;
    if (subjectTotal) subjectTotal.textContent = `${allSubjects.length} ${allSubjects.length === 1 ? "subject" : "subjects"}`;
    if (toggleSubjects) {
      toggleSubjects.hidden = Boolean(term) || allSubjects.length <= 5;
      toggleSubjects.innerHTML = showAllSubjects
        ? 'Show fewer <span aria-hidden="true">↑</span>'
        : `View all ${allSubjects.length} subjects <span aria-hidden="true">↓</span>`;
    }
    if (popularSubjectFilters && popularSubjectList) {
      const popular = allSubjects.slice(0, 4);
      popularSubjectList.innerHTML = popular.map(item =>
        `<button class="quick-filter${chosen.subject.has(item.name) ? " active" : ""}" type="button" data-quick-filter="${escapeHtml(item.name)}">${escapeHtml(item.name)}</button>`
      ).join("");
      popularSubjectFilters.hidden = popular.length === 0;
    }
    quickButtons = Array.from(document.querySelectorAll("[data-quick-filter]"));
  }
  function buildSubjectsFromResources(resources) {
    const grouped = new Map();
    (resources || []).forEach(item => {
      const name = String(item.subject || "").trim().replace(/\\s+/g, " ");
      if (!name) return;
      const key = subjectKey(name);
      if (!grouped.has(key)) grouped.set(key, { name, count: 0 });
      grouped.get(key).count += 1;
    });
    allSubjects = Array.from(grouped.values()).sort((a, b) =>
      b.count - a.count || a.name.localeCompare(b.name)
    );
    renderSubjectOptions();
  }
  function renderActiveFilters() {
    if (!activeFilters) return;
    const values = [
      ...Array.from(chosen.subject, value => ({ group: "subject", value })),
      ...Array.from(chosen.type, value => ({ group: "type", value })),
      ...Array.from(chosen.format, value => ({ group: "format", value }))
    ];
    activeFilters.innerHTML = values.map(item => `<span class="active-filter-chip">${escapeHtml(item.value)} <button type="button" aria-label="Remove ${escapeHtml(item.value)} filter" data-remove-filter="${escapeHtml(item.group)}|${escapeHtml(item.value)}">×</button></span>`).join("");
    activeFilters.querySelectorAll("[data-remove-filter]").forEach(button => button.addEventListener("click", () => {
      const [group, value] = button.dataset.removeFilter.split("|");
      chosen[group].delete(value);
      const checkbox = document.querySelector(`input[name="${group}"][value="${CSS.escape(value)}"]`);
      if (checkbox) checkbox.checked = false;
      render();
    }));
  }
  function matches(card) {
    const query = (search?.value || "").trim().toLowerCase();
    const haystack = `${card.dataset.title} ${card.dataset.subject} ${card.dataset.type} ${card.dataset.format} ${card.dataset.education} ${card.dataset.level} ${card.dataset.semester} ${card.dataset.unit} ${card.dataset.keywords}`.toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (incomingEducation && card.dataset.education !== incomingEducation) return false;
    if (incomingLevel && card.dataset.level !== incomingLevel) return false;
    if (chosen.subject.size && !chosen.subject.has(card.dataset.subject)) return false;
    if (chosen.type.size && !chosen.type.has(card.dataset.type)) return false;
    if (chosen.format.size && !chosen.format.has(card.dataset.format)) return false;
    return true;
  }
  async function renderRealResources() {
    // Real database resources replace the old hard-coded sample cards.
    grid.querySelectorAll('.explore-resource-card').forEach(card => card.remove());
    try {
      const { supabase } = await window.StudyHubData.requireUser().catch(async () => ({ supabase: window.StudyHubData.client() }));
      const { data, error } = await supabase.from('resources').select('id,title,description,subject,format,created_at,education_level,academic_level,semester,unit_topic').order('created_at', { ascending: false });
      if (error) throw error;
      buildSubjectsFromResources(data || []);
      (data || []).forEach(item => {
        const card = document.createElement('article');
        card.className = 'explore-resource-card';
        card.dataset.title = item.title || 'Student resource';
        card.dataset.subject = item.subject || 'General';
        card.dataset.type = 'Notes';
        card.dataset.education = item.education_level || '';
        card.dataset.level = item.academic_level || '';
        card.dataset.semester = item.semester || '';
        card.dataset.unit = item.unit_topic || '';
        card.dataset.format = (item.format || 'FILE').toUpperCase();
        card.dataset.keywords = `${item.title || ''} ${item.subject || ''} ${item.format || ''} ${item.description || ''}`;
        card.dataset.popularity = '0';
        card.dataset.date = (item.created_at || new Date().toISOString()).slice(0,10);
        const details = `resource-details.html?id=${encodeURIComponent(item.id)}`;
        card.innerHTML = `<a class="explore-card-visual visual-network" href="${details}" aria-label="View ${escapeHtml(item.title || 'student resource')}"><span class="visual-file">${escapeHtml((item.format || 'FILE').toUpperCase())}</span><span class="visual-chip">STUDENT RESOURCE</span><div class="visual-network-lines"><i></i><i></i><i></i><i></i><b>SH</b></div></a><div class="explore-card-body"><div class="explore-card-tags"><span class="mini-tag blue-tag">${escapeHtml(item.subject || 'GENERAL')}</span><span class="file-type">${escapeHtml((item.format || 'FILE').toUpperCase())}</span><span class="mini-tag">PUBLISHED</span></div><h3><a href="${details}">${escapeHtml(item.title || 'Student resource')}</a></h3><p>${escapeHtml(item.description || 'Shared by a NotesPix student.')}</p><div class="explore-card-meta"><span class="mini-avatar">SH</span><span>Student contributor</span><span class="meta-spacer"></span><span>Resource</span></div><div class="explore-card-bottom"><span>Added ${new Date(item.created_at || Date.now()).toLocaleDateString()}</span><a href="${details}">View resource <span>→</span></a></div></div>`;
        grid.appendChild(card);
      });
    } catch (error) {
      console.error('Could not load NotesPix resources:', error);
      showToast('Could not load resources. Please refresh and try again.');
    }
    render();
  }

  function updateFilterCounts() {
    const cards = getCards();
    const countFor = (group, value) => cards.filter(card => {
      if (group === "subject") return (card.dataset.subject || "").toLowerCase() === value.toLowerCase();
      if (group === "format") {
        const format = (card.dataset.format || "").toUpperCase();
        if (value === "DOC") return ["DOC", "DOCX", "DOC / DOCX"].includes(format);
        if (value === "PPT") return ["PPT", "PPTX", "POWERPOINT"].includes(format);
        return format === value;
      }
      return false;
    }).length;
    document.querySelectorAll("[data-filter-count]").forEach(node => {
      const [group, value] = node.dataset.filterCount.split("|");
      if (group === "type") {
        node.textContent = "—";
        node.title = "Resource type is not stored in the current database schema yet.";
      } else node.textContent = String(countFor(group, value));
    });
  }

  function render() {
    const cards = getCards();
    updateFilterCounts();
    let visible = cards.filter(matches);
    if (sort?.value === "newest") visible.sort((a, b) => b.dataset.date.localeCompare(a.dataset.date));
    else if (sort?.value === "title") visible.sort((a, b) => a.dataset.title.localeCompare(b.dataset.title));
    else visible.sort((a, b) => Number(b.dataset.popularity) - Number(a.dataset.popularity));
    cards.forEach(card => { card.hidden = true; grid.appendChild(card); });
    visible.forEach(card => { card.hidden = false; grid.appendChild(card); });
    count.textContent = `Showing ${visible.length} of ${cards.length} resources`;
    noResults.hidden = visible.length !== 0;
    grid.hidden = visible.length === 0;
    renderActiveFilters();
    quickButtons.forEach(button => {
      const subject = button.dataset.quickFilter;
      button.classList.toggle("active", chosen.subject.has(subject));
    });
  }
  document.addEventListener("change", event => {
    const input = event.target;
    if (!input.matches('input[name="subject"], input[name="type"], input[name="format"]')) return;
    const group = input.name;
    input.checked ? chosen[group].add(input.value) : chosen[group].delete(input.value);
    if (group === "subject") renderSubjectOptions();
    render();
  });
  subjectSearch?.addEventListener("input", () => {
    showAllSubjects = true;
    renderSubjectOptions();
  });
  toggleSubjects?.addEventListener("click", () => {
    showAllSubjects = !showAllSubjects;
    renderSubjectOptions();
  });
  popularSubjectList?.addEventListener("click", event => {
    const button = event.target.closest("[data-quick-filter]");
    if (!button) return;
    const subject = button.dataset.quickFilter;
    chosen.subject.has(subject) ? chosen.subject.delete(subject) : chosen.subject.add(subject);
    renderSubjectOptions();
    render();
    document.querySelector(".explore-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  form?.addEventListener("submit", event => { event.preventDefault(); render(); });
  search?.addEventListener("input", render);
  sort?.addEventListener("change", render);

  function clearAll() {
    chosen.subject.clear(); chosen.type.clear(); chosen.format.clear();
    document.querySelectorAll('input[name="subject"], input[name="type"], input[name="format"]').forEach(input => input.checked = false);
    if (search) search.value = "";
    if (subjectSearch) subjectSearch.value = "";
    showAllSubjects = false;
    renderSubjectOptions();
    render();
  }
  document.getElementById("clearFilters")?.addEventListener("click", clearAll);
  document.getElementById("resetFromEmpty")?.addEventListener("click", clearAll);
  document.getElementById("loadMoreButton")?.addEventListener("click", () => showToast("You are viewing all resources currently published on NotesPix."));
  document.querySelectorAll("[data-demo-action]").forEach(link => link.addEventListener("click", event => { event.preventDefault(); showToast(`${link.dataset.demoAction} will be available in a later phase.`); }));

  // Support incoming ?q= and ?subject= links without relying on a backend.
  
  const incomingQuery = params.get("q");
  if (incomingQuery && search) search.value = incomingQuery;
  const incomingFormat = params.get("format");
  if (incomingFormat) {
    const normalizedFormat = incomingFormat.toUpperCase();
    const matchingFormats = normalizedFormat === "DOC" ? ["DOC", "DOCX"] :
      normalizedFormat === "PPT" ? ["PPT", "PPTX", "POWERPOINT"] : [normalizedFormat];
    matchingFormats.forEach(value => {
      const input = [...document.querySelectorAll('input[name="format"]')].find(el => el.value.toUpperCase() === value);
      if (input) { input.checked = true; chosen.format.add(input.value); }
    });
  }
  const incomingSubject = params.get("subject");
  if (incomingSubject) {
    const normalized = incomingSubject.replace(/-/g, " ").toLowerCase();
    const match = allSubjects.find(item => item.name.toLowerCase() === normalized);
    if (match) chosen.subject.add(match.name);
  }
  renderSubjectOptions();
  renderRealResources();
})();

// Auth-aware public CTAs use the real Supabase session (not demo localStorage).
(() => {
  function updateAuthCTAs(isSignedIn) {
    document.querySelectorAll("[data-auth-aware-cta]").forEach(link => {
      if (!link.dataset.authOriginalText) link.dataset.authOriginalText = link.textContent.trim();
      if (!link.dataset.authOriginalHref) link.dataset.authOriginalHref = link.getAttribute("href") || "signup.html";
      const original = link.dataset.authOriginalText;
      if (isSignedIn) {
        link.href = "dashboard.html";
        if (/join the community/i.test(original)) link.innerHTML = 'Go to your dashboard <span aria-hidden="true">→</span>';
        else if (/join studyhub/i.test(original)) link.innerHTML = 'Dashboard <span aria-hidden="true">↗</span>';
      } else {
        link.href = link.dataset.authOriginalHref;
        link.textContent = original;
      }
    });
  }

  async function syncAuthCTAs() {
    try {
      const supabase = window.StudyHubData.client();
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      updateAuthCTAs(Boolean(data.session));
      supabase.auth.onAuthStateChange((_event, session) => updateAuthCTAs(Boolean(session)));
    } catch (error) {
      console.warn("Could not check NotesPix session for Explore links:", error);
      updateAuthCTAs(false);
    }
  }

  syncAuthCTAs();
  window.addEventListener("pageshow", syncAuthCTAs);
})();
