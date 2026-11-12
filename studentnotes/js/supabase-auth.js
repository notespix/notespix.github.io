/* Email/password authentication backed by Supabase Auth. */
(() => {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  if (!loginForm && !signupForm) return;

  const setMessage = (element, message, type = 'error') => {
    if (!element) return;
    element.textContent = message;
    element.className = `form-message ${type}`;
  };

  const friendlyError = (error, fallback = 'Something went wrong. Please try again.') => {
    if (window.NotesPixData?.friendlyError) return window.NotesPixData.friendlyError(error, fallback);
    const text = String(error?.message || '');
    if (/invalid login credentials/i.test(text)) return 'Email or password is incorrect.';
    if (/email not confirmed/i.test(text)) return 'Please confirm your email using the link we sent you, then log in.';
    if (/password should be at least|weak password/i.test(text)) return 'Choose a stronger password with at least 8 characters.';
    if (/rate limit|too many requests|429/i.test(text)) return 'Too many attempts. Please wait a moment and try again.';
    return fallback;
  };

  const client = () => {
    if (window.NotesPixData?.client) return window.NotesPixData.client();
    if (!window.supabase?.createClient || !window.NOTESPIX_SUPABASE_URL || !window.NOTESPIX_SUPABASE_PUBLISHABLE_KEY) {
      throw new Error('NotesPix could not connect. Please refresh the page and try again.');
    }
    if (!window.notesPixSupabaseClient) {
      window.notesPixSupabaseClient = window.supabase.createClient(
        window.NOTESPIX_SUPABASE_URL,
        window.NOTESPIX_SUPABASE_PUBLISHABLE_KEY,
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
      );
    }
    return window.notesPixSupabaseClient;
  };

  const postAuthDestination = () => window.matchMedia('(max-width: 767px)').matches ? 'index.html' : 'dashboard.html';
  const authPageUrl = page => new URL(page, window.location.href).href;

  (async () => {
    if (!loginForm) return;
    try {
      const { data: { session } } = await client().auth.getSession();
      if (session?.user) window.location.replace(postAuthDestination());
    } catch (error) {
      setMessage(document.getElementById('loginMessage'), friendlyError(error, 'We could not check your session. Please refresh the page.'));
    }
  })();

  loginForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const email = document.getElementById('loginEmail');
    const password = document.getElementById('loginPassword');
    const message = document.getElementById('loginMessage');
    const submit = loginForm.querySelector('[type="submit"]');
    if (!email.value.trim() || !email.checkValidity()) { setMessage(message, 'Please enter a valid email address.'); email.focus(); return; }
    if (!password.value) { setMessage(message, 'Please enter your password.'); password.focus(); return; }
    submit.disabled = true;
    setMessage(message, 'Signing in…', 'success');
    try {
      const { error } = await client().auth.signInWithPassword({ email: email.value.trim(), password: password.value });
      if (error) throw error;
      setMessage(message, 'Login successful. Opening NotesPix…', 'success');
      window.location.replace(postAuthDestination());
    } catch (error) {
      setMessage(message, friendlyError(error, 'We could not sign you in. Please check your details and try again.'));
      submit.disabled = false;
    }
  });

  signupForm?.addEventListener('submit', async event => {
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
    setMessage(message, 'Creating your account…', 'success');
    try {
      const { data, error } = await client().auth.signUp({
        email: email.value.trim(),
        password: password.value,
        options: {
          data: { full_name: name.value.trim(), role: role.value },
          emailRedirectTo: authPageUrl('login.html')
        }
      });
      if (error) throw error;
      if (data.session && data.user) {
        setMessage(message, 'Account created! Opening NotesPix…', 'success');
        window.location.replace(postAuthDestination());
      } else {
        setMessage(message, 'Account created. Check your email and confirm your address to continue.', 'success');
        submit.disabled = false;
      }
    } catch (error) {
      setMessage(message, friendlyError(error, 'We could not create your account. Please try again.'));
      submit.disabled = false;
    }
  });

  document.getElementById('forgotPassword')?.addEventListener('click', async event => {
    event.preventDefault();
    const email = document.getElementById('loginEmail');
    const message = document.getElementById('loginMessage');
    if (!email.value.trim() || !email.checkValidity()) {
      setMessage(message, 'Enter your email address first, then choose Forgot password.');
      email.focus();
      return;
    }
    try {
      const { error } = await client().auth.resetPasswordForEmail(email.value.trim(), { redirectTo: authPageUrl('login.html') });
      if (error) throw error;
      setMessage(message, 'If an account exists for this email, a password-reset link has been sent.', 'success');
    } catch (error) {
      setMessage(message, friendlyError(error, 'We could not send the reset email. Please try again.'));
    }
  });
})();
