/* Resource details page: render only verified Supabase data; never show sample content. */
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const params = new URLSearchParams(location.search);
  const resourceId = params.get('id');
  const loading = $('#resourceLoading');
  const errorState = $('#resourceError');
  const content = $('#resourceContent');
  const dialog = $('#resourceReportDialog');
  const reportForm = $('#resourceReportForm');
  const reportMessage = $('#reportFormMessage');
  let resource = null;
  let savedByCurrentUser = false;
  let saveBusy = false;
  let reportBusy = false;

  const text = (selector, value, root = document) => {
    const node = $(selector, root);
    if (node) node.textContent = value == null ? '' : String(value);
    return node;
  };
  const formatDate = value => {
    if (!value) return 'Not provided';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Not provided' : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  };
  const formatBytes = value => {
    const bytes = Number(value);
    if (!Number.isFinite(bytes) || bytes < 0) return 'Not available';
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let size = bytes / 1024, index = 0;
    while (size >= 1024 && index < units.length - 1) { size /= 1024; index++; }
    return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[index]}`;
  };
  const prettyFormat = value => String(value || 'FILE').replace(/^application\//i, '').toUpperCase();
  const toast = message => {
    const node = $('#phase3Toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('visible');
    window.setTimeout(() => node.classList.remove('visible'), 2800);
  };
  function showError(message, title = 'Resource unavailable') {
    loading.hidden = true;
    content.hidden = true;
    errorState.hidden = false;
    text('#errorTitle', title);
    text('#errorMessage', message);
    document.title = `${title} — NotesPix`;
  }
  function showContent() {
    loading.hidden = true;
    errorState.hidden = true;
    content.hidden = false;
  }
  function setSaveButton() {
    const button = $('#saveResource');
    if (!button) return;
    button.setAttribute('aria-pressed', String(savedByCurrentUser));
    button.classList.toggle('saved', savedByCurrentUser);
    button.innerHTML = savedByCurrentUser ? '<span>♥</span> Saved' : '<span>♡</span> Save';
  }
  async function loadSavedState(client, user) {
    const { data, error } = await client.from('saved_resources')
      .select('resource_id').eq('user_id', user.id).eq('resource_id', resource.id).maybeSingle();
    if (error) throw error;
    savedByCurrentUser = Boolean(data);
    setSaveButton();
  }
  async function getFileSize(client, path) {
    try {
      const { data } = client.storage.from('studyhub-resources').getPublicUrl(path);
      if (!data?.publicUrl) return 'Not available';
      const response = await fetch(data.publicUrl, { method: 'HEAD', cache: 'no-store' });
      if (!response.ok) return 'Not available';
      return formatBytes(response.headers.get('content-length'));
    } catch (_) { return 'Not available'; }
  }
  async function loadAuthor(client, ownerId) {
    if (!ownerId) return;
    try {
      const { data, error } = await client.from('profiles').select('full_name').eq('id', ownerId).maybeSingle();
      if (error) throw error;
      const name = data?.full_name?.trim();
      if (name) {
        text('#authorName', name);
        text('#authorAvatar', name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase());
      }
    } catch (error) {
      // The resource itself remains usable when profile visibility is restricted.
      console.info('Uploader profile is not publicly available:', error.message);
    }
  }
  function renderResource(data) {
    const title = data.title?.trim() || 'Untitled resource';
    const subject = data.subject?.trim() || 'General';
    const format = prettyFormat(data.format);
    const published = formatDate(data.created_at);
    document.title = `${title} — NotesPix`;
    text('#breadcrumbTitle', title);
    text('#resourceTitle', title);
    text('#sideTitle', title);
    text('#resourceSubtitle', `${subject} · Published ${published}`);
    text('#resourceSubject', subject);
    text('#resourceFormatTag', `${format} DOCUMENT`);
    text('#coverFormat', format.slice(0, 5));
    text('#fileIcon', format.slice(0, 5));
    text('#fileFormat', format);
    text('#publishedDate', published);
    text('#sideDescription', 'A student-shared resource from the NotesPix community.');

    const description = data.description?.trim();
    text('#resourceDescription', description || 'The uploader has not added a description for this resource yet.');

    const education = data.academic_level || '';
    if (education) {
      const level = data.education_level === 'school' ? education : education;
      text('#educationValue', level);
      $('#educationInfo').hidden = false;
    }
    if (data.unit_topic?.trim()) {
      text('#unitValue', data.unit_topic.trim());
      $('#unitInfo').hidden = false;
    }

    const facts = $('#resourceFacts');
    facts.replaceChildren();
    const factItems = [
      { icon: '▤', value: format, label: 'File format' },
      { icon: '◷', value: published, label: 'Published on' }
    ];
    if (education) factItems.push({ icon: '⌂', value: education, label: 'Learning level' });
    factItems.forEach(item => {
      const wrapper = document.createElement('div');
      const icon = document.createElement('span'); icon.className = 'detail-stat-icon'; icon.textContent = item.icon;
      const copy = document.createElement('span');
      const strong = document.createElement('strong'); strong.textContent = item.value;
      const small = document.createElement('small'); small.textContent = item.label;
      copy.append(strong, small); wrapper.append(icon, copy); facts.append(wrapper);
    });
  }
  async function loadRelated(client, data) {
    if (!data.subject) return;
    try {
      const { data: rows, error } = await client.from('resources')
        .select('id,title,subject,format').eq('subject', data.subject).neq('id', data.id).order('created_at', { ascending: false }).limit(3);
      if (error) throw error;
      if (!rows?.length) return;
      const container = $('#relatedResources');
      container.replaceChildren();
      rows.forEach(row => {
        const link = document.createElement('a');
        link.className = 'related-resource';
        link.href = `resource-details.html?id=${encodeURIComponent(row.id)}`;
        const title = document.createElement('strong'); title.textContent = row.title || 'Untitled resource';
        const meta = document.createElement('span'); meta.textContent = `${row.subject || 'General'} · ${prettyFormat(row.format)}`;
        link.append(title, meta); container.append(link);
      });
      $('#relatedSection').hidden = false;
    } catch (error) { console.info('Related resources could not be loaded:', error.message); }
  }
  async function loadResource() {
    if (!resourceId) { showError('This link does not contain a resource ID. Open a resource from Explore to view its details.'); return; }
    try {
      const client = window.StudyHubData.client();
      const { data, error } = await client.from('resources').select('*').eq('id', resourceId).maybeSingle();
      if (error) throw error;
      if (!data || !data.file_path) { showError('This resource may have been removed, or its file is no longer available.'); return; }
      resource = data;
      renderResource(data);
      showContent();

      const [size] = await Promise.all([
        getFileSize(client, data.file_path),
        loadAuthor(client, data.owner_id),
        loadRelated(client, data)
      ]);
      text('#fileSize', size);
      const { data: sessionData, error: sessionError } = await client.auth.getUser();
      if (!sessionError && sessionData?.user) {
        try { await loadSavedState(client, sessionData.user); }
        catch (saveError) { console.info('Saved state unavailable:', saveError.message); }
      }
    } catch (error) {
      console.error('Could not load resource details:', error);
      showError('We could not retrieve this resource from NotesPix. Please check your connection and try again.', 'Could not load resource');
    }
  }

  $('#saveResource')?.addEventListener('click', async () => {
    if (!resource || saveBusy) return;
    saveBusy = true;
    const button = $('#saveResource'); button.disabled = true;
    try {
      const { supabase, user } = await window.StudyHubData.requireUser();
      if (savedByCurrentUser) {
        const { error } = await supabase.from('saved_resources').delete().eq('user_id', user.id).eq('resource_id', resource.id);
        if (error) throw error;
        savedByCurrentUser = false;
        toast('Removed from Saved Notes.');
      } else {
        const { error } = await supabase.from('saved_resources').insert({ user_id: user.id, resource_id: resource.id });
        if (error && error.code !== '23505') throw error;
        savedByCurrentUser = true;
        toast('Saved to your notes.');
      }
      setSaveButton();
      await supabase.from('activity_log').insert({ user_id: user.id, action: savedByCurrentUser ? 'Saved resource' : 'Removed saved resource', resource_id: resource.id });
    } catch (error) { toast(error.message || 'Please log in to save this resource.'); }
    finally { saveBusy = false; button.disabled = false; }
  });

  function openReport() {
    if (!resource) return;
    if (dialog?.showModal) dialog.showModal();
    else dialog?.setAttribute('open', '');
  }
  $('#reportResource')?.addEventListener('click', openReport);
  $('#reportResourceSide')?.addEventListener('click', openReport);
  const closeReport = () => { if (dialog?.open) dialog.close(); else dialog?.removeAttribute('open'); };
  $('#closeReportDialog')?.addEventListener('click', closeReport);
  $('#cancelReport')?.addEventListener('click', closeReport);
  reportForm?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!resource || reportBusy) return;
    const reason = $('#reportReason').value;
    const details = $('#reportDescription').value.trim();
    if (!reason) { reportMessage.textContent = 'Please choose a reason.'; return; }
    reportBusy = true;
    const submit = reportForm.querySelector('[type="submit"]'); submit.disabled = true;
    try {
      const { supabase, user } = await window.StudyHubData.requireUser();
      const { error } = await supabase.from('resource_reports').insert({ reporter_id: user.id, resource_id: resource.id, reason, details });
      if (error) throw error;
      await supabase.from('activity_log').insert({ user_id: user.id, action: 'Resource reported', resource_id: resource.id });
      reportMessage.textContent = 'Report submitted. Thank you for helping the community.';
      submit.textContent = 'Submitted';
      toast('Your report has been submitted.');
    } catch (error) {
      reportMessage.textContent = error.message || 'Please log in and try again.';
      submit.disabled = false;
    } finally { reportBusy = false; }
  });

  $('#downloadResource')?.addEventListener('click', () => {
    if (!resource?.file_path) return;
    try {
      const client = window.StudyHubData.client();
      const { data, error } = client.storage.from('studyhub-resources').getPublicUrl(resource.file_path);
      if (error || !data?.publicUrl) throw error || new Error('File URL unavailable');
      const link = document.createElement('a');
      link.href = data.publicUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    } catch (error) { toast(error.message || 'Could not open the file.'); }
  });

  document.addEventListener('DOMContentLoaded', loadResource);
})();
