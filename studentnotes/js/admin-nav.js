/* Shows the Admin link only after the signed-in account is verified in admin_users. */
(() => {
  document.addEventListener('DOMContentLoaded', async () => {
    const sidebar = document.querySelector('.dashboard-sidebar');
    if (!sidebar) return;
    try {
      if (!window.NotesPixData?.client) return;
      const db = window.NotesPixData.client();
      const { data: sessionData } = await db.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;
      const { data, error } = await db.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
      if (error || !data || sidebar.querySelector('[data-admin-entry]')) return;
      const navs = sidebar.querySelectorAll('.sidebar-nav');
      const target = navs[navs.length - 1];
      if (!target) return;
      const link = document.createElement('a');
      link.className = 'sidebar-link';
      link.href = 'admin.html';
      link.dataset.adminEntry = 'true';
      const icon = document.createElement('span');
      icon.className = 'side-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '▦';
      link.append(icon, document.createTextNode(' Admin dashboard'));
      target.appendChild(link);
    } catch (error) {
      console.warn('NotesPix admin navigation could not be initialized.', error);
    }
  });
})();
