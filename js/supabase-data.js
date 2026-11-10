/* Shared Supabase client and small helpers used by every NotesPix page. */
(() => {
  function client() {
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
  }

  async function requireUser() {
    const supabase = client();
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error('Please sign in to your NotesPix account before continuing.');
    return { supabase, user: data.user };
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function text(value, maxLength = 500) {
    return String(value ?? '').trim().slice(0, maxLength);
  }

  function validUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
  }

  /* Converts database and auth errors into safe messages. Raw SQL errors must never reach the page. */
  function friendlyError(error, fallback = 'Something went wrong. Please try again.') {
    const message = String(error?.message || '');
    if (/invalid login credentials/i.test(message)) return 'Email or password is incorrect.';
    if (/email not confirmed/i.test(message)) return 'Please confirm your email address, then sign in.';
    if (/user already registered/i.test(message)) return 'If this email is not registered yet, check your inbox for a confirmation link.';
    if (/password should be at least|weak password/i.test(message)) return 'Choose a stronger password with at least 8 characters.';
    if (/session|jwt|refresh token|not authenticated|invalid claim/i.test(message)) return 'Your session has expired. Please sign in again.';
    if (/row-level security|permission denied|not authorized|insufficient privilege/i.test(message)) return 'You do not have permission to do that.';
    if (/duplicate key|already exists|23505/i.test(message)) return 'That item already exists.';
    if (/payload too large|maximum allowed size|too large/i.test(message)) return 'That file is too large. Choose a file of 10 MB or smaller.';
    if (/mime|content type/i.test(message)) return 'That file type is not allowed.';
    if (/rate limit|too many requests|429/i.test(message)) return 'Too many attempts. Please wait a moment and try again.';
    if (/failed to fetch|network|load failed/i.test(message)) return 'Could not reach NotesPix. Check your connection and try again.';
    return fallback;
  }

  window.NotesPixData = { client, requireUser, escapeHtml, text, validUuid, friendlyError };
})();
