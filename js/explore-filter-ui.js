(() => {
  const dropdowns = Array.from(document.querySelectorAll('[data-filter-dropdown]'));
  const groups = ['subject', 'type', 'format'];
  const labels = {
    subject: { empty: 'All', singular: 'selected', plural: 'selected' },
    type: { empty: 'Any', singular: 'selected', plural: 'selected' },
    format: { empty: 'Any', singular: 'selected', plural: 'selected' }
  };

  function updateSummaries() {
    groups.forEach(group => {
      const dropdown = document.querySelector(`[data-filter-dropdown="${group}"]`);
      const value = document.getElementById(`${group}FilterSummary`);
      if (!dropdown || !value) return;
      const checked = Array.from(dropdown.querySelectorAll(`input[name="${group}"]:checked`));
      value.textContent = checked.length ? `${checked.length} ${checked.length === 1 ? labels[group].singular : labels[group].plural}` : labels[group].empty;
      dropdown.classList.toggle('has-selection', checked.length > 0);
      dropdown.setAttribute('data-selected-count', String(checked.length));
    });
    const total = document.querySelectorAll('.filter-dropdown input[type="checkbox"]:checked').length;
    const count = document.getElementById('filterActiveCount');
    if (count) count.textContent = total ? `${total} selected` : 'All resources';
    const clear = document.getElementById('clearFilters');
    if (clear) clear.classList.toggle('is-active', total > 0 || Boolean(document.getElementById('resourceSearch')?.value.trim()));
  }

  dropdowns.forEach(dropdown => {
    dropdown.addEventListener('toggle', () => {
      if (!dropdown.open) return;
      dropdowns.forEach(other => { if (other !== dropdown) other.open = false; });
    });
  });

  document.addEventListener('change', event => {
    if (event.target.matches('.filter-dropdown input[type="checkbox"]')) updateSummaries();
  });
  document.getElementById('resourceSearch')?.addEventListener('input', updateSummaries);
  document.getElementById('clearFilters')?.addEventListener('click', () => {
    requestAnimationFrame(() => {
      updateSummaries();
      dropdowns.forEach(dropdown => { dropdown.open = false; });
    });
  });
  document.addEventListener('click', event => {
    if (event.target.closest('.filter-dropdown')) return;
    dropdowns.forEach(dropdown => { dropdown.open = false; });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') dropdowns.forEach(dropdown => { dropdown.open = false; });
  });
  window.updateExploreFilterSummaries = updateSummaries;
  updateSummaries();
})();
