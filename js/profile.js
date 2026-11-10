/* Shared NotesPix profile dropdown interactions. Supabase session/logout is handled by supabase-session-ui.js. */
(() => {
  const initials = name =>
    (String(name || 'Student').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'S');

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-profile-menu]').forEach(menu => {
      const trigger = menu.querySelector('[data-profile-trigger]');
      if (!trigger) return;

      trigger.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const open = menu.classList.toggle('open');
        trigger.setAttribute('aria-expanded', String(open));
      });

      document.addEventListener('click', event => {
        if (!menu.contains(event.target)) {
          menu.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
        }
      });

      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          menu.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    });
  });

  // Keep this helper available to older pages that render initials from local profile data.
  window.notesPixInitials = initials;
})();
