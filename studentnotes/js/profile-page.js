/* NotesPix My Profile — persistent profile identity backed by Supabase Auth + profiles table. */
(() => {
  const form = document.getElementById('profileEditForm');
  if (!form) return;

  const nameInput = document.getElementById('profileName');
  const emailInput = document.getElementById('profileEmail');
  const message = document.getElementById('profileMessage');
  const saveButton = form.querySelector('[type="submit"]');
  const initialAvatar = document.getElementById('profileAvatarPreview');
  const previewName = document.getElementById('profilePreviewName');
  const previewCardName = document.getElementById('profilePreviewCardName');
  const previewCardEmail = document.getElementById('profilePreviewCardEmail');
  const previewCardAvatar = document.getElementById('profilePreviewAvatar');
  let supabase = null;
  let currentUser = null;
  let originalName = '';

  function getClient() {
    if (window.NotesPixData?.client) return window.NotesPixData.client();
    if (!window.supabase?.createClient || !window.NOTESPIX_SUPABASE_URL || !window.NOTESPIX_SUPABASE_PUBLISHABLE_KEY) {
      throw new Error('NotesPix could not connect. Please refresh and try again.');
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

  function initialsFor(value) {
    return String(value || 'S').trim().split(/\s+/).filter(Boolean).slice(0, 2)
      .map(part => part[0]).join('').toUpperCase() || 'S';
  }

  function paintName(value) {
    const display = value || 'Student';
    const initials = initialsFor(display);
    if (previewName) previewName.textContent = display;
    if (previewCardName) previewCardName.textContent = display;
    if (initialAvatar) initialAvatar.textContent = initials;
    if (previewCardAvatar) previewCardAvatar.textContent = initials;
    document.querySelectorAll('[data-profile-fullname]').forEach(node => node.textContent = display);
    document.querySelectorAll('[data-profile-initials]').forEach(node => node.textContent = initials);
  }

  function setMessage(text, kind = '') {
    if (!message) return;
    message.textContent = text;
    message.dataset.state = kind;
    message.hidden = !text;
  }

  async function loadProfile() {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session?.user) {
      window.location.replace('login.html');
      return;
    }

    currentUser = sessionData.session.user;
    const metadataName = currentUser.user_metadata?.full_name || '';
    let profileName = metadataName;

    // Auth metadata is canonical because it is part of the signed-in account session.
    // The public profiles row is a fallback only for older accounts without full_name metadata.
    if (!profileName) {
      try {
        const { data, error } = await supabase.from('profiles')
          .select('full_name').eq('id', currentUser.id).maybeSingle();
        if (error) throw error;
        if (data?.full_name) profileName = data.full_name;
      } catch (error) {
        console.warn('Could not read public profile row; using the account email as fallback.', error);
      }
    }

    profileName = profileName || currentUser.email?.split('@')[0] || 'Student';
    originalName = profileName;
    nameInput.value = profileName;
    emailInput.value = currentUser.email || '';
    if (previewCardEmail) previewCardEmail.textContent = currentUser.email || '';
    paintName(profileName);

    nameInput.disabled = false;
    emailInput.disabled = false;
    saveButton.disabled = false;
  }

  nameInput?.addEventListener('input', () => {
    paintName(nameInput.value.trim() || 'Student');
    if (nameInput.value.trim() === originalName) setMessage('');
    else setMessage('Your new name will be saved to your NotesPix account.', 'info');
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const nextName = nameInput.value.trim();
    if (nextName.length < 2) {
      setMessage('Please enter a name with at least 2 characters.', 'error');
      nameInput.focus();
      return;
    }
    if (nextName.length > 60) {
      setMessage('Please keep your name under 60 characters.', 'error');
      nameInput.focus();
      return;
    }
    if (nextName === originalName) {
      setMessage('Your profile is already up to date.', 'success');
      return;
    }

    saveButton.disabled = true;
    saveButton.querySelector('span').textContent = 'Saving…';
    setMessage('Saving your profile securely…', 'info');

    try {
      // Persist the display name in Supabase Auth so it survives sign-out and refresh.
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: { full_name: nextName }
      });
      if (authError) throw authError;

      currentUser = authData.user || currentUser;

      // Synchronize the public profile name used by resource contributor cards.
      let publicProfileSynced = true;
      const { error: profileError } = await supabase.from('profiles')
        .update({ full_name: nextName }).eq('id', currentUser.id);
      if (profileError) {
        publicProfileSynced = false;
        console.warn('Auth name saved, but public profile name did not sync:', profileError);
      }

      originalName = nextName;
      paintName(nextName);

      if (publicProfileSynced) {
        setMessage('Your name is saved to your NotesPix account. It will stay updated after you reload.', 'success');
      } else {
        setMessage('Your account name is saved. Contributor name sync needs a profiles-table update policy.', 'warning');
      }
    } catch (error) {
      console.error('NotesPix profile update failed:', error);
      setMessage(window.NotesPixData?.friendlyError(error, 'We could not save your profile. Please try again.'), 'error');
    } finally {
      saveButton.disabled = false;
      saveButton.querySelector('span').textContent = 'Save changes';
    }
  });

  (async () => {
    try {
      supabase = getClient();
      await loadProfile();
    } catch (error) {
      console.error('Could not load NotesPix profile:', error);
      nameInput.disabled = true;
      emailInput.disabled = true;
      saveButton.disabled = true;
      setMessage(window.NotesPixData?.friendlyError(error, 'Could not load your profile. Please refresh and try again.'), 'error');
    }
  })();
})();
