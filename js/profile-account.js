/* NotesPix account and security controls, housed on My Profile. */
(() => {
  const $ = id => document.getElementById(id);
  const form = $('profilePasswordForm');
  const message = $('profilePasswordMessage');
  const save = $('saveProfilePassword');

  function client() {
    if (window.NotesPixData?.client) return window.NotesPixData.client();
    if (!window.supabase?.createClient || !window.NOTESPIX_SUPABASE_URL || !window.NOTESPIX_SUPABASE_PUBLISHABLE_KEY) {
      throw new Error('NotesPix authentication is unavailable. Please refresh and try again.');
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
  const initials = value => String(value || 'S').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join('').toUpperCase() || 'S';
  function setMessage(text, state='') {
    if (!message) return;
    message.textContent = text;
    message.dataset.state = state;
    message.hidden = !text;
  }

  async function loadAccount() {
    const auth = client();
    const { data, error } = await auth.auth.getUser();
    if (error) throw error;
    const user = data.user;
    if (!user) { window.location.replace('login.html'); return; }
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student';
    $('accountDisplayName').textContent = name;
    $('accountEmail').textContent = user.email || '';
    $('accountAvatar').textContent = initials(name);
    const created = user.created_at ? new Date(user.created_at) : null;
    $('accountCreatedAt').textContent = created && !Number.isNaN(created.getTime())
      ? created.toLocaleDateString(undefined, { month:'short', year:'numeric' }) : '—';
  }

  $('showProfilePasswordForm')?.addEventListener('click', () => {
    if (!form) return;
    form.hidden = !form.hidden;
    if (!form.hidden) $('profileNewPassword')?.focus();
    setMessage('');
  });
  $('cancelProfilePassword')?.addEventListener('click', () => {
    form?.reset();
    if (form) form.hidden = true;
    setMessage('');
  });
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const password = $('profileNewPassword').value;
    const confirm = $('profileConfirmPassword').value;
    if (password.length < 8) { setMessage('Use at least 8 characters for your password.', 'error'); return; }
    if (password.length > 72) { setMessage('Please keep your password under 72 characters.', 'error'); return; }
    if (password !== confirm) { setMessage('The passwords do not match.', 'error'); return; }
    save.disabled = true;
    save.textContent = 'Updating…';
    setMessage('Updating your password securely…');
    try {
      const { error } = await client().auth.updateUser({ password });
      if (error) throw error;
      form.reset();
      form.hidden = true;
      setMessage('Your password has been updated successfully.', 'success');
    } catch (error) {
      setMessage(window.NotesPixData?.friendlyError(error, 'Could not update your password. Please try again.'), 'error');
    } finally {
      save.disabled = false;
      save.innerHTML = 'Update password <span aria-hidden="true">→</span>';
    }
  });
  $('profileSignOut')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = 'Signing out…';
    try {
      const { error } = await client().auth.signOut();
      if (error) throw error;
      window.location.replace('index.html');
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Sign out';
      setMessage(window.NotesPixData?.friendlyError(error, 'Could not sign out. Please try again.'), 'error');
    }
  });

  // Permanent account deletion is handled only by the server-side Edge Function.
  const deletePanel = $('deleteAccountPanel');
  const deleteInput = $('deleteAccountConfirmation');
  const deleteMessage = $('deleteAccountMessage');
  const deleteButton = $('confirmDeleteAccount');
  $('openDeleteAccount')?.addEventListener('click', () => {
    if (deletePanel) deletePanel.hidden = false;
    deleteInput?.focus();
  });
  $('cancelDeleteAccount')?.addEventListener('click', () => {
    if (deletePanel) deletePanel.hidden = true;
    if (deleteInput) deleteInput.value = '';
    if (deleteMessage) { deleteMessage.hidden = true; deleteMessage.textContent = ''; }
  });
  deleteButton?.addEventListener('click', async () => {
    if (deleteInput?.value.trim() !== 'DELETE') {
      if (deleteMessage) {
        deleteMessage.textContent = 'Please type DELETE exactly to confirm.';
        deleteMessage.hidden = false;
        deleteMessage.dataset.state = 'error';
      }
      return;
    }
    deleteButton.disabled = true;
    deleteButton.textContent = 'Deleting account…';
    if (deleteMessage) {
      deleteMessage.textContent = 'Please wait. Do not close this page.';
      deleteMessage.hidden = false;
      deleteMessage.dataset.state = 'info';
    }
    try {
      const auth = client();
      const { data: sessionData, error: sessionError } = await auth.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) throw new Error('Your session expired. Please sign in again.');
      const { error } = await auth.functions.invoke('delete-account', {
        body: { confirmation: 'DELETE' }
      });
      if (error) throw error;
      try {
        localStorage.removeItem('notespix-preferences');
      } catch (_) {}
      await auth.auth.signOut();
      window.location.replace('index.html?account_deleted=1');
    } catch (error) {
      console.error('NotesPix account deletion failed:', error);
      if (deleteMessage) {
        deleteMessage.textContent = window.NotesPixData?.friendlyError(error, 'Account could not be deleted. Please try again.');
        deleteMessage.hidden = false;
        deleteMessage.dataset.state = 'error';
      }
      deleteButton.disabled = false;
      deleteButton.textContent = 'Permanently delete account';
    }
  });

  loadAccount().catch(error => {
    console.error('Could not load NotesPix account:', error);
    $('accountDisplayName').textContent = 'Account unavailable';
    $('accountEmail').textContent = window.NotesPixData?.friendlyError(error, 'Please refresh and sign in again.');
  });
})();
