/* NotesPix — expandable iOS glass sidebar labels and crisp inline icons. */
(() => {
  const iconPaths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    explore: '<circle cx="12" cy="12" r="9"/><path d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5z"/>',
    upload: '<path d="M12 16V4m-5 5 5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    how: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.3 1.7c-1.1 1.1-1.9 1.4-1.9 3"/><path d="M12 17.5h.01"/>',
    dashboard: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    settings: '<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15 .1.1 1.2 1-1.5 2.6-1.5-.5a7.8 7.8 0 0 1-1.5.9l-.3 1.6h-3l-.3-1.6a7.8 7.8 0 0 1-1.5-.9l-1.5.5-1.5-2.6 1.2-1a7.1 7.1 0 0 1 0-1.8l-1.2-1 1.5-2.6 1.5.5a7.8 7.8 0 0 1 1.5-.9l.3-1.6h3l.3 1.6a7.8 7.8 0 0 1 1.5.9l1.5-.5 1.5 2.6-1.2 1a7.1 7.1 0 0 1 0 1.7Z"/>',
    notes: '<path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5M8 12h8M8 16h8"/>'
  };
  const classify = (href) => {
    const path = (href || '').toLowerCase();
    if (path.includes('explore')) return 'explore';
    if (path.includes('upload')) return 'upload';
    if (path.includes('how-it-works')) return 'how';
    if (path.includes('dashboard')) return 'dashboard';
    if (path.includes('profile')) return 'profile';
    if (path.includes('settings')) return 'settings';
    if (path.includes('saved') || path.includes('activity')) return 'notes';
    return 'home';
  };
  const makeIcon = (name) => `<svg class="nav-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${iconPaths[name] || iconPaths.home}</svg>`;

  document.querySelectorAll('.site-header .primary-nav .nav-link').forEach((link) => {
    if (link.dataset.iconReady === 'true') return;
    const label = (link.textContent || link.getAttribute('title') || '').trim();
    const iconName = classify(link.getAttribute('href'));
    link.textContent = '';
    link.insertAdjacentHTML('afterbegin', `${makeIcon(iconName)}<span class="nav-link-label"></span>`);
    link.querySelector('.nav-link-label').textContent = iconName === 'explore' ? 'Explore' : label;
    link.setAttribute('aria-label', label);
    link.dataset.iconReady = 'true';
  });

  const header = document.querySelector('.site-header');
  if (header) {
    header.classList.add('ios-sidebar-ready');
    const brand = header.querySelector('.brand');
    if (brand) brand.setAttribute('aria-label', 'NotesPix home');
    const theme = header.querySelector('.theme-toggle');
    if (theme) theme.setAttribute('aria-label', 'Toggle light and dark theme');
  }
})();
