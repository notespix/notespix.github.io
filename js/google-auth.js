/* Google OAuth for NotesPix. Signup consent is required before Google can start. */
(() => {
  const buttons = document.querySelectorAll('[data-google-auth]');
  if (!buttons.length) return;

  const getClient = () => {
    if (window.NotesPixData?.client) return window.NotesPixData.client();
    if (window.notesPixSupabaseClient) return window.notesPixSupabaseClient;
    if (!window.supabase?.createClient || !window.NOTESPIX_SUPABASE_URL || !window.NOTESPIX_SUPABASE_PUBLISHABLE_KEY) {
      throw new Error('NotesPix cannot connect to the sign-in service. Refresh the page and try again.');
    }
    window.notesPixSupabaseClient = window.supabase.createClient(
      window.NOTESPIX_SUPABASE_URL,
      window.NOTESPIX_SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
    );
    return window.notesPixSupabaseClient;
  };

  const messageFor = (mode, text, type = 'error') => {
    const element = document.getElementById(mode === 'signup' ? 'signupMessage' : 'loginMessage');
    if (!element) return;
    element.textContent = text;
    element.className = `form-message ${type}`;
  };

  // Complete a Google signup callback only after the user has returned from Google.
  async function finishGoogleSignup() {
    if (sessionStorage.getItem('notespix_google_intent') !== 'signup') return false;
    const client = getClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) {
      sessionStorage.removeItem('notespix_google_intent');
      messageFor('signup', 'Google sign-up could not be completed. Please try again.');
      return true;
    }
    const user = data.user;
    const metadata = user.user_metadata || {};
    const consent = {
      ...metadata,
      full_name: metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Student',
      role: metadata.role || 'other',
      terms_accepted_at: new Date().toISOString(),
      age_eligibility_confirmed: true,
      age_guardian_consent_at: new Date().toISOString(),
      registration_method: 'google'
    };
    const { error: updateError } = await client.auth.updateUser({ data: consent });
    if (updateError) {
      await client.auth.signOut();
      sessionStorage.removeItem('notespix_google_intent');
      messageFor('signup', 'Your Google account was verified, but NotesPix could not save your consent. Please try again.');
      return true;
    }
    sessionStorage.removeItem('notespix_google_intent');
    window.location.replace(new URL('dashboard.html', window.location.href).href);
    return true;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try { await finishGoogleSignup(); }
    catch (error) {
      console.error('Google signup completion failed:', error);
      sessionStorage.removeItem('notespix_google_intent');
      messageFor('signup', 'We could not finish Google sign-up. Please refresh and try again.');
    }
  });

  buttons.forEach(button => button.addEventListener('click', async () => {
    const signupMode = document.getElementById('signupPanel') && !document.getElementById('signupPanel').hidden;
    const mode = signupMode ? 'signup' : 'login';
    if (signupMode) {
      const terms = document.getElementById('signupTerms');
      const age = document.getElementById('signupAgeConsent');
      if (!terms?.checked) {
        messageFor('signup', 'Please accept the Terms & Conditions and acknowledge the Privacy Policy before continuing.');
        terms?.focus();
        return;
      }
      if (!age?.checked) {
        messageFor('signup', 'Please confirm that you are 18 or older, or have permission from your parent or legal guardian.');
        age?.focus();
        return;
      }
      sessionStorage.setItem('notespix_google_intent', 'signup');
    } else {
      sessionStorage.setItem('notespix_google_intent', 'login');
    }

    const original = button.innerHTML;
    button.disabled = true;
    button.textContent = 'Connecting to Google…';
    try {
      const client = getClient();
      const redirectTo = new URL('login.html', window.location.href).href;
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Google sign-in failed:', error);
      sessionStorage.removeItem('notespix_google_intent');
      button.innerHTML = original;
      button.disabled = false;
      const text = /network|fetch/i.test(error?.message || '')
        ? 'Google sign-in could not connect. Check your internet connection and try again.'
        : /provider.*disabled|unsupported provider/i.test(error?.message || '')
          ? 'Google sign-in is not enabled in Supabase yet. Please contact NotesPix support.'
          : 'Google sign-in could not start. Please try again in a moment.';
      messageFor(mode, text);
    }
  }));
})();
