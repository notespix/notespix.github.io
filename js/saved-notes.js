(() => {
  const list = document.getElementById('savedList');
  const esc = value => window.StudyHubData?.escapeHtml(value) ?? String(value ?? '');
  const toast = message => {
    const el = document.getElementById('phase6Toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 2600);
  };
  function empty(message, showExplore = true) {
    list.innerHTML = `<div class="phase6-empty"><div class="phase6-empty-icon">♡</div><h3>${esc(message)}</h3><p>${showExplore ? 'Open a resource from Explore Resources and press Save to keep it in your personal library.' : 'Please refresh the page or sign in again.'}</p>${showExplore ? '<a class="button button-primary" href="explore.html">Explore resources</a>' : ''}</div>`;
  }
  function render(items) {
    if (!items.length) { empty('Nothing saved yet'); return; }
    list.innerHTML = items.map(item => {
      const resource = item.resources || {};
      const title = resource.title || item.title || 'Study resource';
      const subject = resource.subject || item.subject || 'Study resource';
      const format = resource.format || item.format || 'FILE';
      const id = item.resource_id || item.id;
      const savedAt = item.created_at || item.savedAt;
      return `<article class="phase6-saved-card"><div class="phase6-saved-top"><span class="phase6-file-icon">${esc(format.toUpperCase())}</span><span class="phase6-status" style="background:#edf8f2;color:#19845a">Saved</span></div><h3>${esc(title)}</h3><p>${esc(subject)} · Saved ${savedAt ? new Date(savedAt).toLocaleDateString() : 'recently'}</p><div class="phase6-card-actions"><a href="resource-details.html?id=${encodeURIComponent(id)}">View resource ↗</a><button type="button" data-remove="${esc(id)}">Remove</button></div></article>`;
    }).join('');
    list.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => removeSaved(button.dataset.remove, button)));
  }
  async function load() {
    if (!window.StudyHubData) { empty('Could not connect to NotesPix', false); return; }
    list.innerHTML = '<p class="muted-note">Loading your saved resources…</p>';
    try {
      const { supabase, user } = await window.StudyHubData.requireUser();
      const { data, error } = await supabase.from('saved_resources').select('user_id,resource_id,created_at,resources(id,title,description,subject,format,file_path,created_at,owner_id)').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      render((data || []).filter(item => item.resources));
    } catch (error) {
      console.error('Could not load saved resources:', error);
      empty(error.message || 'Could not load saved resources', false);
    }
  }
  async function removeSaved(resourceId, button) {
    button.disabled = true;
    try {
      const { supabase, user } = await window.StudyHubData.requireUser();
      const { error } = await supabase.from('saved_resources').delete().eq('user_id', user.id).eq('resource_id', resourceId);
      if (error) throw error;
      await supabase.from('activity_log').insert({ user_id: user.id, action: 'Removed saved resource', resource_id: resourceId });
      toast('Removed from Saved Notes.');
      await load();
    } catch (error) {
      button.disabled = false;
      toast(error.message || 'Could not remove this saved resource.');
    }
  }
  load();
})();
