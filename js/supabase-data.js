/* Shared Supabase client and helpers for real NotesPix data. */
(() => {
  function client() {
    if (!window.supabase?.createClient || !window.STUDYHUB_SUPABASE_URL || !window.STUDYHUB_SUPABASE_PUBLISHABLE_KEY) {
      throw new Error('Supabase is not configured. Reload the page and check the connection.');
    }
    if (!window.studyHubSupabaseClient) {
      window.studyHubSupabaseClient = window.supabase.createClient(
        window.STUDYHUB_SUPABASE_URL,
        window.STUDYHUB_SUPABASE_PUBLISHABLE_KEY,
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
      );
    }
    return window.studyHubSupabaseClient;
  }
  async function requireUser() {
    const supabase = client();
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error('Please log in with your NotesPix account before continuing.');
    return { supabase, user: data.user };
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }
  window.StudyHubData = { client, requireUser, escapeHtml };
})();
