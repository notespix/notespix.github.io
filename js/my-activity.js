(() => {
  const list = document.getElementById('activityList');
  const clearButton = document.getElementById('clearActivity');
  const toast = message => {
    const el = document.getElementById('phase6Toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('visible');
    window.setTimeout(() => el.classList.remove('visible'), 2800);
  };
  const esc = value => window.StudyHubData?.escapeHtml(value) ?? String(value ?? '');
  const icons = {
    'Saved resource': '♡',
    'Removed saved resource': '−',
    'Resource published': '↥',
    'Resource reported': '⚑',
    'Profile updated': '◎',
    'Logged in': '↪'
  };
  function empty(message, detail) {
    list.innerHTML = `<div class="phase6-empty"><div class="phase6-empty-icon">◷</div><h3>${esc(message)}</h3><p>${esc(detail)}</p><a class="button button-primary" href="explore.html">Explore resources</a></div>`;
  }
  function render(items) {
    if (!items.length) {
      empty('No activity yet', 'Actions such as saving, publishing or reporting a resource will appear here.');
      return;
    }
    list.innerHTML = items.map(item => {
      const action = item.action || 'NotesPix activity';
      const title = item.resources?.title || (item.resource_id ? 'NotesPix resource' : 'Your NotesPix account');
      const date = item.created_at ? new Date(item.created_at) : null;
      const dateText = date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : 'Recently';
      return `<article class="phase6-activity"><div class="phase6-activity-icon">${esc(icons[action] || '•')}</div><div><h3>${esc(action)}</h3><p>${esc(title)}</p><time datetime="${esc(item.created_at || '')}">${esc(dateText)}</time></div></article>`;
    }).join('');
  }
  async function load() {
    if (!window.StudyHubData) {
      empty('Could not connect to NotesPix', 'Please refresh the page and try again.');
      return;
    }
    list.innerHTML = '<p class="muted-note">Loading your activity…</p>';
    try {
      const { supabase, user } = await window.StudyHubData.requireUser();
      const { data, error } = await supabase.from('activity_log')
        .select('id,action,resource_id,created_at,resources(title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      render(data || []);
    } catch (error) {
      console.error('Could not load NotesPix activity:', error);
      empty(error.message || 'Could not load activity', 'Please refresh the page or sign in again.');
    }
  }
  clearButton?.addEventListener('click', async () => {
    if (!window.confirm('Clear your activity history? This cannot be undone.')) return;
    clearButton.disabled = true;
    try {
      const { supabase, user } = await window.StudyHubData.requireUser();
      const { data: deletedRows, error } = await supabase.from('activity_log')
        .delete()
        .eq('user_id', user.id)
        .select('id');
      if (error) throw error;
      if (!deletedRows || deletedRows.length === 0) {
        toast('Your activity history is already clear.');
        await load();
        return;
      }
      toast(`Activity history cleared (${deletedRows.length} items).`);
      await load();
    } catch (error) {
      console.error('Could not clear activity:', error);
      toast(error.message || 'Could not clear activity history.');
    } finally {
      clearButton.disabled = false;
    }
  });
  load();
})();
