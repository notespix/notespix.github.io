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
    if (/invalid login credentials/i.test(text)) return 'We could not find an account with those details. Check your email and password, or create an account first.';
    if (/user already registered|already been registered/i.test(text)) return 'An account with this email already exists. Please log in instead.';
    if (/email address.*invalid|invalid email/i.test(text)) return 'That email address does not look valid. Please check it and try again.';
    if (/signup is disabled|signups not allowed/i.test(text)) return 'New registrations are temporarily unavailable. Please try again later.';
    if (/captcha|verification token/i.test(text)) return 'Security verification failed or expired. Please complete the check again.';
    if (/network|fetch failed|failed to fetch/i.test(text)) return 'We could not reach NotesPix. Check your internet connection and try again.';
    if (/email rate limit|rate limit.*email/i.test(text)) return 'Too many confirmation emails have been requested. Please wait before trying again.';
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
    if (!email.value.trim() || !email.checkValidity()) { setMessage(message, 'Please enter a valid email address, such as name@example.com.'); email.focus(); return; }
    if (!password.value) { setMessage(message, 'Please enter your password.'); password.focus(); return; }
    if (password.value.length < 8) { setMessage(message, 'Your password must be at least 8 characters long.'); password.focus(); return; }
    submit.disabled = true;
    setMessage(message, 'Signing in securely…', 'success');
    let captchaToken;
    try {
      captchaToken = await window.NotesPixCaptcha.getToken('loginCaptcha');
      const { error } = await client().auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value,
        options: { captchaToken }
      });
      if (error) throw error;
      setMessage(message, 'Login successful. Opening NotesPix…', 'success');
      window.location.replace(postAuthDestination());
    } catch (error) {
      setMessage(message, friendlyError(error, 'We could not sign you in. Please check your details and try again.'));
      submit.disabled = false;
    } finally {
      window.NotesPixCaptcha?.reset('loginCaptcha');
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
    const ageConsent = document.getElementById('signupAgeConsent');
    const message = document.getElementById('signupMessage');
    const submit = signupForm.querySelector('[type="submit"]');
    if (name.value.trim().length < 2) { setMessage(message, 'Please enter your name.'); name.focus(); return; }
    if (!email.value.trim() || !email.checkValidity()) { setMessage(message, 'Please enter a valid email address, such as name@example.com.'); email.focus(); return; }
    if (!role.value) { setMessage(message, 'Please choose your learner type.'); role.focus(); return; }
    if (password.value.length < 8) { setMessage(message, 'Use at least 8 characters for your password.'); password.focus(); return; }
    if (password.value !== confirm.value) { setMessage(message, 'Your passwords do not match.'); confirm.focus(); return; }
    if (!terms.checked) { setMessage(message, 'Please accept the Terms and acknowledge the Privacy Policy to continue.'); terms.focus(); return; }
    if (!ageConsent.checked) { setMessage(message, 'Please confirm the age and parent/guardian permission statement to continue.'); ageConsent.focus(); return; }
    submit.disabled = true;
    setMessage(message, 'Creating your account…', 'success');
    try {
      const captchaToken = await window.NotesPixCaptcha.getToken('signupCaptcha');
      const { data, error } = await client().auth.signUp({
        email: email.value.trim(),
        password: password.value,
        options: {
          captchaToken,
          data: {
            full_name: name.value.trim(),
            role: role.value,
            age_eligibility_confirmed: true,
            terms_accepted_at: new Date().toISOString()
          },
          emailRedirectTo: authPageUrl('login.html')
        }
      });
      if (error) throw error;
      if (data.session && data.user) {
        setMessage(message, 'Account created! Opening NotesPix…', 'success');
        window.location.replace(postAuthDestination());
      } else {
        setMessage(message, 'Your account is created. Check your inbox (and spam folder) for the confirmation link. You must confirm your email before logging in.', 'success');
        submit.disabled = false;
      }
    } catch (error) {
      setMessage(message, friendlyError(error, 'We could not create your account. Please try again.'));
      submit.disabled = false;
    } finally {
      window.NotesPixCaptcha?.reset('signupCaptcha');
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
      const captchaToken = await window.NotesPixCaptcha.getToken('loginCaptcha');
      const { error } = await client().auth.resetPasswordForEmail(email.value.trim(), {
        redirectTo: authPageUrl('login.html'),
        captchaToken
      });
      if (error) throw error;
      setMessage(message, 'If an account exists for this email, a password-reset link has been sent.', 'success');
    } catch (error) {
      setMessage(message, friendlyError(error, 'We could not send the reset email. Please try again.'));
    } finally {
      window.NotesPixCaptcha?.reset('loginCaptcha');
    }
  });
})();
