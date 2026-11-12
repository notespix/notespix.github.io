/* NotesPix admin console. Administrator status is verified against public.admin_users. */
(() => {
  const $ = id => document.getElementById(id);
  let db, cache = { support: [], reports: [] };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const date = value => value ? new Date(value).toLocaleString() : '—';
  const notice = (message, state='info') => {
    const node = $('adminNotice'); if (!node) return;
    node.textContent = message; node.dataset.state = state;
  };
  const statusLabel = value => ({open:'Open',in_progress:'In progress',reviewing:'Reviewing',resolved:'Resolved',dismissed:'Dismissed'}[value] || value || 'Open');

  function getClient() {
    if (window.NotesPixData?.client) return window.NotesPixData.client();
    if (!window.supabase?.createClient || !window.NOTESPIX_SUPABASE_URL || !window.NOTESPIX_SUPABASE_PUBLISHABLE_KEY) {
      throw new Error('NotesPix could not connect. Please reload the page.');
    }
    if (!window.notesPixSupabaseClient) window.notesPixSupabaseClient = window.supabase.createClient(
      window.NOTESPIX_SUPABASE_URL, window.NOTESPIX_SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
    );
    return window.notesPixSupabaseClient;
  }

  async function requireAdmin() {
    const { data: sessionData, error: sessionError } = await db.auth.getSession();
    if (sessionError) throw sessionError;
    const user = sessionData.session?.user;
    if (!user) { location.replace('login.html'); return false; }
    const { data, error } = await db.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
    if (error) throw new Error('Could not verify administrator access. Please try again.');
    if (!data) {
      notice('Access denied. This account is not registered as a NotesPix administrator.', 'error');
      document.querySelectorAll('[data-admin-tab], #adminRefresh').forEach(el => el.disabled = true);
      return false;
    }
    return true;
  }

  async function count(table, filters, column = '*') {
    let query = db.from(table).select(column, { count: 'exact', head: true });
    if (filters) query = filters(query);
    const { count: total, error } = await query;
    if (error) throw error;
    return total || 0;
  }

  async function loadOverview() {
    const [students, resources, support, reports] = await Promise.all([
      // profiles has column-level SELECT grants; count only its permitted id column.
      count('profiles', null, 'id'),
      count('resources'),
      count('support_requests', q => q.eq('status','open')),
      count('resource_reports', q => q.eq('status','open'))
    ]);
    $('statStudents').textContent = students;
    $('statResources').textContent = resources;
    $('statSupport').textContent = support;
    $('statReports').textContent = reports;
    $('supportNavCount').textContent = support;
    $('reportsNavCount').textContent = reports;
    $('adminStats').hidden = false;
  }

  async function loadStudents() {
    const { data, error } = await db.from('profiles').select('id,full_name,created_at').order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    $('studentsRows').innerHTML = data?.length ? data.map(row => {
      const name = row.full_name || row.name || 'Student';
      return `<tr><td><strong>${esc(name)}</strong></td><td><code>${esc(row.id)}</code></td><td>${esc(date(row.created_at))}</td></tr>`;
    }).join('') : '<tr><td colspan="3">No student profiles found.</td></tr>';
  }

  async function loadResources() {
    const { data, error } = await db.from('resources')
      .select('id,title,subject,format,owner_id,created_at')
      .order('created_at', { ascending: false }).limit(250);
    if (error) throw error;
    $('resourcesRows').innerHTML = data?.length ? data.map(row =>
      `<tr><td><strong>${esc(row.title || 'Untitled resource')}</strong><small>${esc(row.id)}</small></td><td>${esc(row.subject || '—')}</td><td>${esc(row.format || '—')}</td><td><code>${esc(row.owner_id || '—')}</code></td><td>${esc(date(row.created_at))}</td></tr>`
    ).join('') : '<tr><td colspan="5">No resources found.</td></tr>';
  }

  async function loadSupport() {
    const { data, error } = await db.from('support_requests')
      .select('id,user_id,email,topic,message,status,created_at')
      .order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    cache.support = data || [];
    renderSupport();
  }
  function renderSupport() {
    const filter = $('supportFilter').value;
    const rows = cache.support.filter(row => filter === 'all' || row.status === filter);
    $('supportRows').innerHTML = rows.length ? rows.map(row => `
      <article class="admin-request-card">
        <div class="admin-request-top"><div><span class="admin-topic">${esc(row.topic)}</span><span class="admin-date">${esc(date(row.created_at))}</span></div><span class="admin-status status-${esc(row.status)}">${esc(statusLabel(row.status))}</span></div>
        <p class="admin-request-message">${esc(row.message)}</p>
        <div class="admin-request-meta"><span>${esc(row.email || 'Email not provided')}</span><code>${esc(row.user_id)}</code></div>
        <div class="admin-request-actions"><label for="support-${esc(row.id)}">Update status</label><select id="support-${esc(row.id)}" data-support-status="${esc(row.id)}"><option value="open" ${row.status==='open'?'selected':''}>Open</option><option value="in_progress" ${row.status==='in_progress'?'selected':''}>In progress</option><option value="resolved" ${row.status==='resolved'?'selected':''}>Resolved</option></select></div>
      </article>`).join('') : '<p class="admin-empty">No support requests match this filter.</p>';
  }

  async function loadReports() {
    const { data, error } = await db.from('resource_reports')
      .select('id,reporter_id,resource_id,reason,details,status,created_at')
      .order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    cache.reports = data || [];
    renderReports();
  }
  function renderReports() {
    const filter = $('reportsFilter').value;
    const rows = cache.reports.filter(row => filter === 'all' || row.status === filter);
    $('reportsRows').innerHTML = rows.length ? rows.map(row => `
      <article class="admin-request-card">
        <div class="admin-request-top"><div><span class="admin-topic">${esc(row.reason || 'Resource report')}</span><span class="admin-date">${esc(date(row.created_at))}</span></div><span class="admin-status status-${esc(row.status)}">${esc(statusLabel(row.status))}</span></div>
        <p class="admin-request-message">${esc(row.details || 'No additional details provided.')}</p>
        <div class="admin-request-meta"><span>Resource: <code>${esc(row.resource_id)}</code></span><span>Reported by: <code>${esc(row.reporter_id)}</code></span></div>
        <div class="admin-request-actions"><label for="report-${esc(row.id)}">Update status</label><select id="report-${esc(row.id)}" data-report-status="${esc(row.id)}"><option value="open" ${row.status==='open'?'selected':''}>Open</option><option value="reviewing" ${row.status==='reviewing'?'selected':''}>Reviewing</option><option value="resolved" ${row.status==='resolved'?'selected':''}>Resolved</option><option value="dismissed" ${row.status==='dismissed'?'selected':''}>Dismissed</option></select></div>
      </article>`).join('') : '<p class="admin-empty">No reports match this filter.</p>';
  }

  async function refreshAll() {
    notice('Refreshing live NotesPix data…');
    try {
      await Promise.all([loadOverview(), loadStudents(), loadResources(), loadSupport(), loadReports()]);
      notice('Admin dashboard is up to date.', 'success');
    } catch (error) {
      console.error('Admin data refresh failed:', error);
      notice(window.NotesPixData?.friendlyError(error, 'Could not load admin data. Please try again.'), 'error');
    }
  }

  function activateTab(tab) {
    document.querySelectorAll('[data-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.panel === tab));
    document.querySelectorAll('.sidebar-link[data-admin-tab]').forEach(link => link.classList.toggle('selected', link.dataset.adminTab === tab));
    if (location.hash !== `#${tab}`) history.replaceState(null, '', `#${tab}`);
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-admin-tab]');
    if (trigger && !trigger.disabled) { event.preventDefault(); activateTab(trigger.dataset.adminTab); }
  });
  $('supportFilter')?.addEventListener('change', renderSupport);
  $('reportsFilter')?.addEventListener('change', renderReports);
  document.addEventListener('change', async event => {
    const supportId = event.target.dataset.supportStatus;
    const reportId = event.target.dataset.reportStatus;
    if (!supportId && !reportId) return;
    const select = event.target;
    select.disabled = true;
    try {
      const table = supportId ? 'support_requests' : 'resource_reports';
      const id = supportId || reportId;
      const { error } = await db.from(table).update({ status: select.value }).eq('id', id);
      if (error) throw error;
      notice('Status updated successfully.', 'success');
      await refreshAll();
    } catch (error) {
      notice(window.NotesPixData?.friendlyError(error, 'Could not update status. Please try again.'), 'error');
      select.disabled = false;
    }
  });
  $('adminRefresh')?.addEventListener('click', refreshAll);

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      db = getClient();
      const allowed = await requireAdmin();
      if (!allowed) return;
      notice('Administrator access verified. Loading live data…', 'success');
      await refreshAll();
      const initialTab = location.hash.replace('#','');
      activateTab(['overview','students','resources','support','reports'].includes(initialTab) ? initialTab : 'overview');
    } catch (error) {
      console.error('Admin initialization failed:', error);
      notice(window.NotesPixData?.friendlyError(error, 'Could not initialize the admin dashboard. Please reload the page.'), 'error');
    }
  });
})();
