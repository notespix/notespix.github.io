/* Authentication page interactions: password visibility and login/signup switching. */
(() => {
  const layout = document.querySelector('.auth-layout');
  if (!layout) return;

  const loginPanel = document.getElementById('loginPanel');
  const signupPanel = document.getElementById('signupPanel');
  const loginHeading = document.getElementById('loginHeading');
  const signupHeading = document.getElementById('signupHeading');
  const visual = layout.querySelector('.auth-visual-content');
  const originalVisual = visual.innerHTML;

  const signupVisual = `
    <span class="auth-kicker"><i></i> LEARN. SHARE. GROW.</span>
    <h1>Good things<br>happen when<br>we <span>share.</span></h1>
    <p>Join a student community that makes finding and sharing study resources easier.</p>
    <div class="auth-preview-card">
      <div class="preview-card-icon">✦</div>
      <div><strong>Your knowledge can help someone.</strong><small>Start building your learning library.</small></div>
      <span>↗</span>
    </div>
    <div class="auth-orb auth-orb-one"></div>
    <div class="auth-orb auth-orb-two"></div>
    <div class="auth-star star-one">✦</div>
    <div class="auth-star star-two">✧</div>`;

  function setMode(mode, animate = true) {
    const isSignup = mode === 'signup';
    if (animate) layout.querySelector('.auth-form-wrap')?.classList.add('panel-changing');
    layout.classList.toggle('is-signup', isSignup);
    loginPanel.hidden = isSignup;
    signupPanel.hidden = !isSignup;
    loginHeading.hidden = isSignup;
    signupHeading.hidden = !isSignup;
    visual.innerHTML = isSignup ? signupVisual : originalVisual;
    window.NotesPixCaptcha?.renderVisible().catch(() => {});
    document.title = isSignup ? 'Create an account — NotesPix' : 'Log in — NotesPix';
    history.replaceState(null, '', isSignup ? 'signup.html' : 'login.html');
    window.setTimeout(() => layout.querySelector('.auth-form-wrap')?.classList.remove('panel-changing'), 280);
  }

  document.addEventListener('click', event => {
    const switchLink = event.target.closest('[data-auth-switch]');
    if (switchLink) {
      event.preventDefault();
      setMode(switchLink.dataset.authSwitch);
      return;
    }

    const toggle = event.target.closest('[data-toggle-password]');
    if (!toggle) return;
    const input = document.getElementById(toggle.dataset.togglePassword);
    if (!input) return;
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    toggle.textContent = visible ? 'Hide' : 'Show';
    toggle.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
  });

  const initial = location.pathname.toLowerCase().endsWith('signup.html') ? 'signup' : 'login';
  setMode(initial, false);
})();
