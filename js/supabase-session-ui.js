/* NotesPix: keep header identity and redirects synchronized with the real Supabase session. */
(() => {
  const USER_KEY = 'studyhub-demo-user';
  const getClient = () => {
    if (!window.supabase?.createClient || !window.STUDYHUB_SUPABASE_URL || !window.STUDYHUB_SUPABASE_PUBLISHABLE_KEY) return null;
    if (!window.studyHubSupabaseClient) {
      window.studyHubSupabaseClient = window.supabase.createClient(
        window.STUDYHUB_SUPABASE_URL,
        window.STUDYHUB_SUPABASE_PUBLISHABLE_KEY,
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
      );
    }
    return window.studyHubSupabaseClient;
  };

  const saveUser = user => {
    if (!user) {
      localStorage.removeItem(USER_KEY);
      return null;
    }
    const metadata = user.user_metadata || {};
    const profile = {
      id: user.id,
      name: metadata.full_name || user.email?.split('@')[0] || 'Student',
      email: user.email || '',
      role: metadata.role || 'other'
    };
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
    return profile;
  };

  const paint = profile => {
    const signedIn = Boolean(profile);
    document.querySelectorAll('.header-actions .login-link, .header-actions a[data-demo-link="login"]').forEach(link => {
      link.style.display = signedIn ? 'none' : '';
    });
    document.querySelectorAll('.header-actions a[href="signup.html"], .header-actions a[data-demo-link="signup"]').forEach(link => {
      link.style.display = signedIn ? 'none' : '';
    });
    document.querySelectorAll('[data-profile-menu]').forEach(menu => {
      menu.style.display = signedIn ? 'block' : 'none';
      if (!signedIn) {
        menu.classList.remove('open');
        menu.querySelector('[data-profile-trigger]')?.setAttribute('aria-expanded', 'false');
      }
    });

    if (!signedIn) return;
    const name = profile.name || 'Student';
    const initials = (name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'S');
    document.querySelectorAll('[data-profile-name], [data-profile-fullname]').forEach(el => {
      el.textContent = name;
    });
    document.querySelectorAll('[data-profile-initials]').forEach(el => {
      el.textContent = initials;
    });
    document.querySelectorAll('.header-actions [data-auth-aware-cta]').forEach(el => {
      el.style.display = 'none';
    });
    document.querySelectorAll('main [data-auth-aware-cta]').forEach(el => {
      el.href = 'dashboard.html';
      el.textContent = 'Go to your dashboard →';
    });
    const welcome = document.querySelector('.welcome-row h1');
    if (welcome) welcome.innerHTML = `Hey ${name.split(/\s+/)[0]} <span class="wave">✦</span>`;
  };

  const destinationAfterAuth = () =>
    window.matchMedia('(max-width: 767px)').matches ? 'index.html' : 'dashboard.html';
  const isAuthPage = () => /\/(login|signup)\.html$/i.test(window.location.pathname);
  const redirectAfterAuth = () => {
    const destination = destinationAfterAuth();
    if (!window.location.pathname.toLowerCase().endsWith('/' + destination)) {
      window.location.replace(new URL(destination, window.location.href).href);
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    const auth = getClient();
    if (!auth) return;

    // Bind logout before awaiting session initialization so the button can never race another handler.
    document.querySelectorAll('[data-profile-logout]').forEach(button => {
      if (button.dataset.supabaseLogoutBound === 'true') return;
      button.dataset.supabaseLogoutBound = 'true';
      button.addEventListener('click', async event => {
        event.preventDefault();
        event.stopPropagation();
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Signing out…';
        try {
          const { error } = await auth.auth.signOut();
          if (error) throw error;
          saveUser(null);
          window.location.replace(new URL('index.html', window.location.href).href);
        } catch (error) {
          console.error('NotesPix logout failed:', error);
          button.disabled = false;
          button.textContent = originalText;
          window.alert('Could not log out right now. Please try again.');
        }
      });
    });

    auth.auth.onAuthStateChange((event, session) => {
      const profile = saveUser(session?.user || null);
      paint(profile);
      if (event === 'SIGNED_OUT') {
        const isIndex = /\/index\.html$/i.test(window.location.pathname) || window.location.pathname.endsWith('/');
        if (!isIndex) window.location.replace(new URL('index.html', window.location.href).href);
      }
    });

    (async () => {
      try {
        const { data, error } = await auth.auth.getSession();
        if (error) throw error;
        const profile = saveUser(data.session?.user || null);
        paint(profile);

        const confirmationCallback =
          window.location.hash.includes('access_token=') ||
          window.location.search.includes('code=');

        if (profile && (isAuthPage() || confirmationCallback)) {
          if (confirmationCallback) {
            history.replaceState({}, document.title, window.location.pathname);
          }
          redirectAfterAuth();
          return;
        }

        // Protect the dashboard using the real Supabase session, not a stale localStorage flag.
        if (!profile && document.body.classList.contains('dashboard-page')) {
          window.location.replace(new URL('login.html', window.location.href).href);
        }
      } catch (error) {
        console.error('NotesPix session initialization failed:', error);
        const message = document.getElementById('loginMessage') || document.getElementById('signupMessage');
        if (message) {
          message.textContent = 'We could not verify your session. Please refresh the page and try again.';
          message.className = 'form-message error';
        }
      }
    })();
  });
})();
