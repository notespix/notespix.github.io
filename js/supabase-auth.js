/* NotesPix Phase 11.1: real Supabase email/password authentication. */
(() => {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  if (!loginForm && !signupForm) return;

  const setMessage = (element, message, type = 'error') => {
    if (!element) return;
    element.textContent = message;
    element.className = `form-message ${type}`;
  };
  const friendlyError = (error) => {
    const text = String(error?.message || 'Something went wrong. Please try again.');
    if (/invalid login credentials/i.test(text)) return 'Email or password is incorrect.';
    if (/email not confirmed/i.test(text)) return 'Please confirm your email using the link we sent you, then log in.';
    if (/user already registered/i.test(text)) return 'An account with this email already exists. Try logging in.';
    if (/password should be at least/i.test(text)) return 'Choose a stronger password with at least 8 characters.';
    return text;
  };
  const postAuthDestination = () => window.matchMedia('(max-width: 767px)').matches ? 'index.html' : 'dashboard.html';
  const saveUiProfile = (user, fallbackName = 'Student', fallbackRole = 'other') => {
    const metadata = user?.user_metadata || {};
    const profile = {
      id: user.id,
      name: metadata.full_name || fallbackName || user.email?.split('@')[0] || 'Student',
      email: user.email || '',
      role: metadata.role || fallbackRole
    };
    localStorage.setItem('studyhub-demo-user', JSON.stringify(profile));
    return profile;
  };
  const supabaseReady = () => {
    if (!window.supabase?.createClient) throw new Error('Supabase library did not load. Check your internet connection and reload the page.');
    if (!window.STUDYHUB_SUPABASE_URL || !window.STUDYHUB_SUPABASE_PUBLISHABLE_KEY) throw new Error('Supabase configuration is missing.');
    if (!window.studyHubSupabaseClient) {
      window.studyHubSupabaseClient = window.supabase.createClient(
        window.STUDYHUB_SUPABASE_URL,
        window.STUDYHUB_SUPABASE_PUBLISHABLE_KEY,
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
      );
    }
    return window.studyHubSupabaseClient;
  };

  // If an existing Supabase session visits login, use its real user identity.
  (async () => {
    try {
      const client = supabaseReady();
      const { data: { session } } = await client.auth.getSession();
      if (session?.user && loginForm) {
        saveUiProfile(session.user);
        window.location.replace(postAuthDestination());
      }
    } catch (error) {
      if (loginForm) setMessage(document.getElementById('loginMessage'), error.message);
    }
  })();

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('loginEmail');
    const password = document.getElementById('loginPassword');
    const message = document.getElementById('loginMessage');
    const submit = loginForm.querySelector('[type="submit"]');
    if (!email.value.trim() || !email.checkValidity()) { setMessage(message, 'Please enter a valid email address.'); email.focus(); return; }
    if (!password.value) { setMessage(message, 'Please enter your password.'); password.focus(); return; }
    submit.disabled = true;
    setMessage(message, 'Signing in securely…', 'success');
    try {
      const client = supabaseReady();
      const { data, error } = await client.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
      if (error) throw error;
      saveUiProfile(data.user);
      setMessage(message, 'Login successful. Opening NotesPix…', 'success');
      window.location.replace(postAuthDestination());
    } catch (error) {
      setMessage(message, friendlyError(error));
      submit.disabled = false;
    }
  });

  signupForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('signupName');
    const email = document.getElementById('signupEmail');
    const role = document.getElementById('signupRole');
    const password = document.getElementById('signupPassword');
    const confirm = document.getElementById('signupConfirm');
    const terms = document.getElementById('signupTerms');
    const message = document.getElementById('signupMessage');
    const submit = signupForm.querySelector('[type="submit"]');
    if (name.value.trim().length < 2) { setMessage(message, 'Please enter your name.'); name.focus(); return; }
    if (!email.value.trim() || !email.checkValidity()) { setMessage(message, 'Please enter a valid email address.'); email.focus(); return; }
    if (!role.value) { setMessage(message, 'Please choose your learner type.'); role.focus(); return; }
    if (password.value.length < 8) { setMessage(message, 'Use at least 8 characters for your password.'); password.focus(); return; }
    if (password.value !== confirm.value) { setMessage(message, 'Your passwords do not match.'); confirm.focus(); return; }
    if (!terms.checked) { setMessage(message, 'Please accept the Terms and Privacy Policy to continue.'); terms.focus(); return; }
    submit.disabled = true;
    setMessage(message, 'Creating your account securely…', 'success');
    try {
      const client = supabaseReady();
      const { data, error } = await client.auth.signUp({
        email: email.value.trim(),
        password: password.value,
        options: {
          data: { full_name: name.value.trim(), role: role.value },
          // Send confirmation callbacks to a page that loads Supabase Auth and can exchange the URL tokens for a session.
          emailRedirectTo: `${window.location.origin}/login.html`
        }
      });
      if (error) throw error;
      if (data.session && data.user) {
        saveUiProfile(data.user, name.value.trim(), role.value);
        setMessage(message, 'Account created! Opening NotesPix…', 'success');
        window.location.replace(postAuthDestination());
      } else {
        setMessage(message, 'Account created! Check your email and confirm your address. After confirmation, NotesPix will open automatically.', 'success');
        submit.disabled = false;
      }
    } catch (error) {
      setMessage(message, friendlyError(error));
      submit.disabled = false;
    }
  });

  document.getElementById('forgotPassword')?.addEventListener('click', async (event) => {
    event.preventDefault();
    const email = document.getElementById('loginEmail');
    const message = document.getElementById('loginMessage');
    if (!email.value.trim() || !email.checkValidity()) {
      setMessage(message, 'Enter your email address first, then click Forgot password.');
      email.focus(); return;
    }
    try {
      const client = supabaseReady();
      const { error } = await client.auth.resetPasswordForEmail(email.value.trim(), { redirectTo: `${window.location.origin}/login.html` });
      if (error) throw error;
      setMessage(message, 'If an account exists for this email, a password-reset link has been sent.', 'success');
    } catch (error) { setMessage(message, friendlyError(error)); }
  });
})();
