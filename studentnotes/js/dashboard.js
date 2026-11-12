(() => {
  const sidebar = document.getElementById('dashboardSidebar');
  const toggle = document.getElementById('dashboardMenuToggle');
  const overlay = document.getElementById('dashboardOverlay');
  const toast = document.getElementById('dashboardToast');
  let toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2800);
  }
  document.getElementById('notificationButton')?.addEventListener('click', () => showToast('You’re all caught up!'));
  document.querySelectorAll('.sidebar-help a[href="#"]').forEach(link => link.addEventListener('click', e => {
    e.preventDefault(); showToast('Help and support is available from the Help page.');
  }));

  const esc = value => window.NotesPixData?.escapeHtml(value) ?? String(value ?? '');
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const formatDate = value => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };
  const initials = value => String(value || 'Student').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'S';
  const emptyState = (title, detail, href, label) => `<div class="dashboard-empty"><strong>${esc(title)}</strong><p>${esc(detail)}</p>${href ? `<a href="${href}">${esc(label || 'Explore resources')} →</a>` : ''}</div>`;

  function renderSaved(items) {
    const host = document.getElementById('dashboardSavedResources');
    if (!host) return;
    if (!items.length) {
      host.innerHTML = emptyState('Your library is empty', 'Save a resource from Explore Resources and it will appear here.', 'explore.html', 'Explore resources');
      return;
    }
    host.innerHTML = items.slice(0, 3).map(row => {
      const r = row.resources || {};
      const fmt = String(r.format || 'FILE').toUpperCase();
      return `<article class="continue-card dashboard-real-card">
        <div class="continue-art dashboard-file-art"><span class="art-label">${esc(fmt.slice(0,4))}</span></div>
        <div class="continue-info"><div class="resource-meta"><span class="resource-tag tag-blue">${esc(r.subject || 'General')}</span><span>•</span><span>${esc(fmt)}</span></div>
        <h3>${esc(r.title || 'Study resource')}</h3><p>${esc(r.description || 'Saved to your NotesPix library.')}</p>
        <div class="resource-author"><span>Saved ${esc(formatDate(row.created_at))}</span></div></div>
        <a class="resource-open-button dashboard-open-link" href="resource-details.html?id=${encodeURIComponent(r.id || row.resource_id)}" aria-label="Open ${esc(r.title || 'resource')}">→</a>
      </article>`;
    }).join('');
  }

  function renderCommunity(items) {
    const host = document.getElementById('dashboardCommunityResources');
    if (!host) return;
    if (!items.length) {
      host.innerHTML = emptyState('No resources shared yet', 'When students publish resources, the latest ones will appear here.', 'upload.html', 'Upload the first resource');
      return;
    }
    host.innerHTML = `<div class="community-row community-table-head"><span>RESOURCE</span><span>SUBJECT</span><span>ADDED</span><span></span></div>` + items.map(r => {
      const fmt = String(r.format || 'FILE').toUpperCase();
      return `<div class="community-row"><span class="community-resource"><span class="file-badge ${fmt === 'PDF' ? 'pdf-badge' : 'doc-badge'}">${esc(fmt.slice(0,4))}</span><span><strong>${esc(r.title || 'Study resource')}</strong><small>${esc(r.description || 'Student resource')}</small></span></span><span><span class="subject-pill">${esc(r.subject || 'General')}</span></span><span class="muted-cell">${esc(formatDate(r.created_at))}</span><a class="table-action dashboard-table-link" href="resource-details.html?id=${encodeURIComponent(r.id)}" aria-label="View ${esc(r.title || 'resource')}">↗</a></div>`;
    }).join('');
  }

  function renderWeeklyActivity(rows) {
    const chart = document.getElementById('dashboardActivityChart');
    if (!chart) return;
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate() - (6 - i));
      return { date: d, count: 0 };
    });
    rows.forEach(row => {
      const d = new Date(row.created_at);
      const day = days.find(x => x.date.toDateString() === d.toDateString());
      if (day) day.count += 1;
    });
    const max = Math.max(1, ...days.map(x => x.count));
    const total = days.reduce((n, x) => n + x.count, 0);
    setText('weeklyActivityTotal', `${total} actions`);
    chart.innerHTML = `<div class="chart-gridline gridline-one"></div><div class="chart-gridline gridline-two"></div><div class="chart-gridline gridline-three"></div><div class="chart-bars">${days.map(x => `<div class="chart-day"><i style="height:${Math.max(5, x.count / max * 88)}%" title="${x.count} activities"></i><span>${x.date.toLocaleDateString(undefined, { weekday: 'short' })}</span></div>`).join('')}</div>`;
  }

  async function loadDashboard() {
    const savedHost = document.getElementById('dashboardSavedResources');
    const communityHost = document.getElementById('dashboardCommunityResources');
    try {
      if (!window.NotesPixData) throw new Error('NotesPix data connection is not ready. Refresh the page.');
      const { supabase, user } = await window.NotesPixData.requireUser();
      const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student';
      const firstName = fullName.trim().split(/\s+/)[0];
      const greeting = document.getElementById('dashboardGreeting');
      if (greeting) greeting.innerHTML = `Hey ${esc(firstName)} <span class="wave">✦</span>`;
      document.querySelectorAll('[data-profile-fullname]').forEach(el => el.textContent = fullName);
      document.querySelectorAll('[data-profile-initials]').forEach(el => el.textContent = initials(fullName));

      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const [savedCountRes, uploadCountRes, activityCountRes, monthUploadRes, savedRes, communityRes, activityRes] = await Promise.all([
        supabase.from('saved_resources').select('resource_id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('resources').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
        supabase.from('activity_log').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', thirtyDaysAgo),
        supabase.from('resources').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).gte('created_at', monthStart.toISOString()),
        supabase.from('saved_resources').select('user_id,resource_id,created_at,resources(id,title,description,subject,format)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
        supabase.from('resources').select('id,title,description,subject,format,created_at').order('created_at', { ascending: false }).limit(3),
        supabase.from('activity_log').select('created_at,action').eq('user_id', user.id).gte('created_at', weekAgo).order('created_at', { ascending: true }).limit(500)
      ]);
      for (const result of [savedCountRes, uploadCountRes, activityCountRes, monthUploadRes, savedRes, communityRes, activityRes]) if (result.error) throw result.error;

      setText('savedCount', String(savedCountRes.count ?? 0));
      setText('uploadCount', String(uploadCountRes.count ?? 0));
      setText('activityCount', String(activityCountRes.count ?? 0));
      setText('monthlyUploadCount', String(monthUploadRes.count ?? 0));
      setText('contributionTotal', String(uploadCountRes.count ?? 0));
      setText('contributionMonth', `${monthUploadRes.count ?? 0} shared this month`);
      renderSaved((savedRes.data || []).filter(row => row.resources));
      renderCommunity(communityRes.data || []);
      renderWeeklyActivity(activityRes.data || []);
    } catch (error) {
      console.error('Could not load real NotesPix dashboard data:', error);
      const message = window.NotesPixData?.friendlyError(error, 'Please refresh the page and try again.') || 'Please refresh the page and try again.';
      if (savedHost) savedHost.innerHTML = emptyState('Could not load your library', message, 'login.html', 'Sign in');
      if (communityHost) communityHost.innerHTML = emptyState('Could not load community resources', message, 'explore.html', 'Explore resources');
      ['savedCount','uploadCount','activityCount','monthlyUploadCount','contributionTotal','weeklyActivityTotal'].forEach(id => setText(id, '—'));
      const chart = document.getElementById('dashboardActivityChart');
      if (chart) chart.innerHTML = `<p class="dashboard-loading">${esc(message)}</p>`;
    }
  }

  const dateElement = document.getElementById('todayDate');
  if (dateElement) dateElement.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());
  loadDashboard();
})();
