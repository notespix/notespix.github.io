/* NotesPix responsive navigation. Account controls stay in the header, never inside the hamburger. */
(() => {
  const menuIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.site-header').forEach(header => {
      const nav = header.querySelector('.primary-nav');
      const inner = header.querySelector('.header-inner');
      if (!nav || !inner) return;

      let button = header.querySelector('.mobile-menu-toggle');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'mobile-menu-toggle icon-button';
        button.setAttribute('aria-label', 'Open navigation');
        button.setAttribute('aria-expanded', 'false');
        if (!nav.id) nav.id = 'primaryNav';
        button.setAttribute('aria-controls', nav.id);
        button.innerHTML = menuIcon;
        inner.appendChild(button);
      }

      const close = () => {
        nav.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-label', 'Open navigation');
      };

      if (button.dataset.responsiveBound !== 'true') {
        button.dataset.responsiveBound = 'true';
        button.addEventListener('click', () => {
          const open = nav.classList.toggle('open');
          button.setAttribute('aria-expanded', String(open));
          button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
        });
        nav.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
        document.addEventListener('keydown', event => {
          if (event.key === 'Escape') close();
        });
        document.addEventListener('click', event => {
          if (!header.contains(event.target)) close();
        });
        window.addEventListener('resize', () => {
          if (window.innerWidth > 1023) close();
        });
      }
    });

    document.querySelectorAll('.dashboard-page').forEach(page => {
      const sidebar = page.querySelector('.dashboard-sidebar');
      if (!sidebar) return;
      if (!sidebar.id) sidebar.id = 'dashboardSidebar';
      let toggle = page.querySelector('.dashboard-menu-toggle');
      const topbar = page.querySelector('.dashboard-topbar');
      if (!toggle && topbar) {
        toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'dashboard-menu-toggle';
        toggle.setAttribute('aria-label', 'Open navigation');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-controls', sidebar.id);
        toggle.textContent = '☰';
        topbar.insertBefore(toggle, topbar.firstChild);
      }
      let overlay = page.querySelector('.dashboard-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'dashboard-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        page.appendChild(overlay);
      }
      const close = () => {
        sidebar.classList.remove('sidebar-open');
        overlay.classList.remove('overlay-visible');
        toggle?.setAttribute('aria-expanded', 'false');
      };
      const open = () => {
        sidebar.classList.add('sidebar-open');
        overlay.classList.add('overlay-visible');
        toggle?.setAttribute('aria-expanded', 'true');
      };
      if (toggle && toggle.dataset.responsiveBound !== 'true') {
        toggle.dataset.responsiveBound = 'true';
        toggle.addEventListener('click', () => sidebar.classList.contains('sidebar-open') ? close() : open());
      }
      if (!overlay.dataset.responsiveBound) {
        overlay.dataset.responsiveBound = 'true';
        overlay.addEventListener('click', close);
      }
      sidebar.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
        if (window.innerWidth <= 1023) close();
      }));
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') close();
      });
      window.addEventListener('resize', () => {
        if (window.innerWidth > 1023) close();
      });
    });
  });
})();
