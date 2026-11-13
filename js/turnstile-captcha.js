/* Cloudflare Turnstile integration for Supabase Auth. */
(() => {
  const siteKey = window.NOTESPIX_TURNSTILE_SITE_KEY;
  const widgets = new Map();
  const tokens = new Map();
  const waiters = new Map();
  let loadPromise;

  function loadTurnstile() {
    if (window.turnstile) return Promise.resolve();
    if (loadPromise) return loadPromise;
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Security verification could not load. Please refresh and try again.'));
      document.head.appendChild(script);
    });
    return loadPromise;
  }

  async function renderVisible() {
    if (!siteKey) throw new Error('Security verification is not configured. Please contact NotesPix support.');
    await loadTurnstile();
    document.querySelectorAll('.np-turnstile').forEach(element => {
      if (element.offsetParent === null || widgets.has(element.id)) return;
      const id = window.turnstile.render(element, {
        sitekey: siteKey,
        theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
        callback(token) {
          tokens.set(element.id, token);
          const resolve = waiters.get(element.id);
          if (resolve) {
            waiters.delete(element.id);
            resolve(token);
          }
        },
        'expired-callback'() {
          tokens.delete(element.id);
          const resolve = waiters.get(element.id);
          if (resolve) {
            waiters.delete(element.id);
          }
        },
        'error-callback'() {
          tokens.delete(element.id);
          const resolve = waiters.get(element.id);
          if (resolve) {
            waiters.delete(element.id);
          }
        }
      });
      widgets.set(element.id, id);
    });
  }

  async function getToken(elementId) {
    await renderVisible();
    const element = document.getElementById(elementId);
    if (!element || element.offsetParent === null) throw new Error('Please open the form and complete the security check.');
    const existing = tokens.get(elementId);
    if (existing) return existing;
    if (!widgets.has(elementId)) throw new Error('Security check is loading. Please try again.');
    return new Promise((resolve, reject) => {
      waiters.set(elementId, resolve);
      window.setTimeout(() => {
        if (waiters.get(elementId) === resolve) {
          waiters.delete(elementId);
          reject(new Error('Please complete the security check before continuing.'));
        }
      }, 120000);
    });
  }

  function reset(elementId) {
    tokens.delete(elementId);
    const id = widgets.get(elementId);
    if (id !== undefined && window.turnstile) window.turnstile.reset(id);
  }

  window.NotesPixCaptcha = { renderVisible, getToken, reset };
  document.addEventListener('DOMContentLoaded', () => renderVisible().catch(() => {}));
})();
