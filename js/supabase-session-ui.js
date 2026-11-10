/* Keeps the header identity, sign-out control, and protected-page redirects in sync with the real Supabase session. */
(() => {
  const getClient = () => {
    if (window.NotesPixData?.client) return window.NotesPixData.client();
    if (!window.supabase?.createClient || !window.NOTESPIX_SUPABASE_URL || !window.NOTESPIX_SUPABASE_PUBLISHABLE_KEY) return null;
    if (!window.notesPixSupabaseClient) {
      window.notesPixSupabaseClient = window.supabase.createClient(
        window.NOTESPIX_SUPABASE_URL,
        window.NOTESPIX_SUPABASE_PUBLISHABLE_KEY,
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
      );
    }
    return window.notesPixSupabaseClient;
  };

  const profileFromUser = user => {
    if (!user) return null;
    const metadata = user.user_metadata || {};
    return {
      id: user.id,
      name: metadata.full_name || user.email?.split('@')[0] || 'Student',
      role: metadata.role || 'other'
    };
  };

  const paint = profile => {
    const signedIn = Boolean(profile);
    document.querySelectorAll('.header-actions .login-link').forEach(link => {
      link.style.display = signedIn ? 'none' : '';
    });
    document.querySelectorAll('.header-actions a[href="signup.html"]').forEach(link => {
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
    const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'S';
    document.querySelectorAll('[data-profile-name], [data-profile-fullname]').forEach(element => {
      element.textContent = name;
    });
    document.querySelectorAll('[data-profile-initials]').forEach(element => {
      element.textContent = initials;
    });
    document.querySelectorAll('.header-actions [data-auth-aware-cta]').forEach(element => {
      element.style.display = 'none';
    });
    document.querySelectorAll('main [data-auth-aware-cta]').forEach(element => {
      element.href = 'dashboard.html';
      element.textContent = 'Go to your dashboard →';
    });
    const welcome = document.querySelector('.welcome-row h1');
    if (welcome) {
      welcome.textContent = `Hey ${name.trim().split(/\s+/)[0]} `;
      const accent = document.createElement('span');
      accent.className = 'wave';
      accent.setAttribute('aria-hidden', 'true');
      accent.textContent = '✦';
      welcome.append(accent);
    }
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
          window.location.replace(new URL('index.html', window.location.href).href);
        } catch (error) {
          console.error('Sign-out failed:', error);
          button.disabled = false;
          button.textContent = originalText;
          window.alert('Could not log out right now. Please try again.');
        }
      });
    });

    auth.auth.onAuthStateChange((event, session) => {
      paint(profileFromUser(session?.user || null));
      if (event === 'SIGNED_OUT') {
        const isIndex = /\/index\.html$/i.test(window.location.pathname) || window.location.pathname.endsWith('/');
        if (!isIndex) window.location.replace(new URL('index.html', window.location.href).href);
      }
    });

    (async () => {
      try {
        const { data, error } = await auth.auth.getSession();
        if (error) throw error;
        const profile = profileFromUser(data.session?.user || null);
        paint(profile);

        const confirmationCallback =
          window.location.hash.includes('access_token=') ||
          window.location.search.includes('code=');

        if (profile && (isAuthPage() || confirmationCallback)) {
          if (confirmationCallback) history.replaceState({}, document.title, window.location.pathname);
          redirectAfterAuth();
          return;
        }

        if (!profile && document.body.classList.contains('dashboard-page')) {
          window.location.replace(new URL('login.html', window.location.href).href);
        }
      } catch (error) {
        console.error('Session initialization failed:', error);
        const message = document.getElementById('loginMessage') || document.getElementById('signupMessage');
        if (message) {
          message.textContent = 'We could not verify your session. Please refresh the page and try again.';
          message.className = 'form-message error';
        }
      }
    })();
  });
})();
