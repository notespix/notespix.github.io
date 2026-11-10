(() => {
  const list = document.getElementById('uploadsList');
  if (!list) return;
  const esc = value => window.NotesPixData.escapeHtml(value);
  const empty = () => {
    list.innerHTML = '<div class="workspace-empty"><h3>No uploads yet</h3><p>When you publish a resource, it will appear here.</p><a class="button button-primary" href="upload.html">Upload a resource</a></div>';
  };
  const render = item => `
    <article class="workspace-resource" data-resource-id="${esc(item.id)}">
      <div class="workspace-file-icon">${esc((item.format || 'FILE').toUpperCase())}</div>
      <div class="workspace-resource-main">
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.subject || 'General')} · Published ${new Date(item.created_at).toLocaleDateString()}</p>
      </div>
      <span class="workspace-status status-approved">Published</span>
      <div class="workspace-card-actions">
        <a href="resource-details.html?id=${encodeURIComponent(item.id)}">View details</a>
        <button type="button" class="upload-delete-button" data-delete-resource="${esc(item.id)}" aria-label="Delete ${esc(item.title)}">Delete</button>
      </div>
    </article>`;
  const load = async () => {
    list.innerHTML = '<p role="status">Loading your resources…</p>';
    try {
      const { supabase, user } = await window.NotesPixData.requireUser();
      const { data, error } = await supabase.from('resources')
        .select('id,title,subject,format,file_path,created_at')
        .eq('owner_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      if (!data?.length) { empty(); return; }
      list.innerHTML = data.map(render).join('');
    } catch (error) {
      console.error('Could not load uploads:', error);
      list.innerHTML = `<div class="workspace-empty"><h3>Could not load uploads</h3><p>${esc(window.NotesPixData?.friendlyError(error, 'Please sign in and try again.'))}</p><a href="login.html">Log in</a></div>`;
    }
  };

  list.addEventListener('click', async event => {
    const button = event.target.closest('[data-delete-resource]');
    if (!button) return;
    const id = button.dataset.deleteResource;
    const card = button.closest('[data-resource-id]');
    const title = card?.querySelector('h3')?.textContent || 'this resource';
    if (!window.confirm(`Delete "${title}"? This will remove the published resource from NotesPix. This action cannot be undone.`)) return;

    button.disabled = true;
    button.textContent = 'Deleting…';
    try {
      const { supabase, user } = await window.NotesPixData.requireUser();
      const { data: resource, error: fetchError } = await supabase.from('resources')
        .select('id,file_path').eq('id', id).eq('owner_id', user.id).single();
      if (fetchError) throw fetchError;
      if (!resource) throw new Error('This resource was not found in your account.');

      // Remove the database record first. The storage policy below restricts file deletion
      // to the owner's own user-id folder.
      const { error: deleteError } = await supabase.from('resources')
        .delete().eq('id', id).eq('owner_id', user.id);
      if (deleteError) throw deleteError;

      if (resource.file_path) {
        const { error: storageError } = await supabase.storage.from('studyhub-resources').remove([resource.file_path]);
        if (storageError) {
          console.error('Resource record deleted but Storage cleanup failed:', storageError);
          window.alert('The resource was removed from NotesPix, but its stored file could not be cleaned up. Please contact support.');
        }
      }
      try {
        await supabase.from('activity_log').insert({ user_id: user.id, action: 'Resource deleted', resource_id: null });
      } catch (_) {}
      card?.remove();
      if (!list.querySelector('[data-resource-id]')) empty();
    } catch (error) {
      console.error('Could not delete NotesPix resource:', error);
      window.alert(window.NotesPixData?.friendlyError(error, 'Could not delete this resource. Please try again.'));
      button.disabled = false;
      button.textContent = 'Delete';
    }
  });

  document.addEventListener('DOMContentLoaded', load);
})();