/* NotesPix shared theme controller — one preference across every page. */
(() => {
  "use strict";
  const KEY = "notespix-theme";
  const root = document.documentElement;

  function readTheme() {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "dark" || saved === "light") return saved;
    } catch (_) {}
    return "dark"; // Keep the site's established default appearance.
  }

  function applyTheme(theme, persist = true) {
    const safe = theme === "light" ? "light" : "dark";
    root.dataset.theme = safe;
    root.style.colorScheme = safe;
    if (persist) {
      try { localStorage.setItem(KEY, safe); } catch (_) {}
    }

    document.querySelectorAll("[data-theme-toggle]").forEach(button => {
      const dark = safe === "dark";
      button.setAttribute("aria-pressed", String(dark));
      button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      const icon = button.querySelector(".theme-toggle-icon");
      const label = button.querySelector(".theme-toggle-label");
      if (icon) icon.textContent = dark ? "☀" : "☾";
      if (label) label.textContent = dark ? "Light mode" : "Dark mode";
    });
    document.querySelectorAll("[data-theme-status]").forEach(node => {
      node.textContent = safe === "dark" ? "Dark mode is on" : "Light mode is on";
    });
    document.querySelectorAll("[data-select-theme]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.selectTheme === safe));
    });
    document.dispatchEvent(new CustomEvent("notespix:theme-changed", { detail: { theme: safe } }));
  }

  // Apply immediately, before the page is interacted with.
  applyTheme(readTheme(), false);

  document.addEventListener("click", event => {
    const toggle = event.target.closest("[data-theme-toggle]");
    if (!toggle) return;
    event.preventDefault();
    applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
  });
  document.addEventListener("click", event => {
    const choice = event.target.closest("[data-select-theme]");
    if (!choice) return;
    event.preventDefault();
    applyTheme(choice.dataset.selectTheme);
  });

  // Keep other tabs/pages in the same browser in sync as well.
  window.addEventListener("storage", event => {
    if (event.key === KEY && (event.newValue === "dark" || event.newValue === "light")) {
      applyTheme(event.newValue, false);
    }
  });

  window.NotesPixTheme = { apply: applyTheme, get: () => root.dataset.theme || readTheme() };
})();
