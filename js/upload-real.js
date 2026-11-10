/* Real upload: Supabase Storage first, then resource metadata in public.resources. */
(() => {
  const form = document.getElementById('resourceUploadForm');
  if (!form) return;
  const message = document.getElementById('uploadFormMessage');
  const fileInput = document.getElementById('resourceFile');
  const fileLabel = document.getElementById('selectedFileLabel');
  const submit = form.querySelector('[type="submit"]');
  const authNotice = document.getElementById('uploadAuthNotice');
  const syncUploadAccess = async () => {
    try {
      const supabase = window.NotesPixData?.client?.();
      if (!supabase) throw new Error('NotesPix authentication is unavailable.');
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const signedIn = Boolean(data.session);
      if (authNotice) authNotice.hidden = signedIn;
      form.hidden = !signedIn;
    } catch (error) {
      console.warn('Could not check upload access:', error);
      if (authNotice) authNotice.hidden = false;
      form.hidden = true;
    }
  };
  syncUploadAccess();
  window.addEventListener('pageshow', syncUploadAccess);

  const educationLevel = document.getElementById('educationLevel');
  const academicLevel = document.getElementById('academicLevel');
  const semesterRow = document.getElementById('semesterRow');
  const schoolTopicField = document.getElementById('schoolTopicField');
  const unitTopicInput = document.getElementById('unitTopic');
  const schoolTopicInput = document.getElementById('schoolUnitTopic');

  function updateAcademicOptions() {
    const level = educationLevel?.value || '';
    academicLevel.innerHTML = '<option value="">Choose class / year</option>';
    academicLevel.disabled = !level;
    if (level === 'school') {
      for (let grade=6; grade<=12; grade++) academicLevel.add(new Option(`Class ${grade}`, `Class ${grade}`));
      if (semesterRow) semesterRow.hidden = true;
      if (schoolTopicField) schoolTopicField.hidden = false;
    } else if (level === 'college') {
      ['1st Year','2nd Year','3rd Year','4th Year','5th Year'].forEach(v => academicLevel.add(new Option(v,v)));
      if (semesterRow) semesterRow.hidden = false;
      if (schoolTopicField) schoolTopicField.hidden = true;
    } else {
      academicLevel.innerHTML = '<option value="">Choose education level first</option>';
      if (semesterRow) semesterRow.hidden = true;
      if (schoolTopicField) schoolTopicField.hidden = true;
    }
  }
  educationLevel?.addEventListener('change', updateAcademicOptions);
  const MAX = 10 * 1024 * 1024;
  const mimeByExt = {
    pdf: 'application/pdf', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  };
  const setMessage = (text, kind = '') => {
    message.textContent = text;
    message.dataset.state = kind;
  };
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) { fileLabel.textContent = 'Choose a PDF, DOC, DOCX, PPT, or PPTX file (maximum 10 MB).'; return; }
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!mimeByExt[ext]) { fileInput.value = ''; fileLabel.textContent = 'Unsupported file type. Choose PDF, DOC, DOCX, PPT, or PPTX.'; setMessage('Unsupported file type.'); return; }
    if (file.size > MAX) { fileInput.value = ''; fileLabel.textContent = 'File is too large. Maximum size is 10 MB.'; setMessage('File is too large.'); return; }
    fileLabel.textContent = `${file.name} · ${Math.max(1, Math.ceil(file.size / 1024))} KB`;
    setMessage('');
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const supabase = window.NotesPixData?.client?.();
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        if (authNotice) authNotice.hidden = false;
        form.hidden = true;
        return;
      }
    } catch (_) {
      if (authNotice) authNotice.hidden = false;
      form.hidden = true;
      return;
    }
    const title = document.getElementById('resourceTitle').value.trim();
    const subject = document.getElementById('resourceSubject').value.trim();
    const description = document.getElementById('resourceDescriptionInput')?.value.trim() || '';
    const format = document.getElementById('resourceFormat').value;
    const education = educationLevel?.value || '';
    const academic = academicLevel?.value || '';
    const semester = document.getElementById('semester')?.value || null;
    const unitTopic = (education === 'school' ? schoolTopicInput?.value : unitTopicInput?.value || '').trim();
    const file = fileInput?.files?.[0];
    if (!title || !subject || !format || !file || !education || !academic) { setMessage('Please add the title, subject, class/year, file format, and choose a file.'); return; }
    if (title.length > 100) { setMessage('Please keep the title under 100 characters.'); return; }
    if (subject.length > 60) { setMessage('Please keep the subject under 60 characters.'); return; }
    if (description.length > 500) { setMessage('Please keep the description under 500 characters.'); return; }
    if (unitTopic.length > 100) { setMessage('Please keep the topic under 100 characters.'); return; }
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!mimeByExt[ext] || file.size > MAX) { setMessage('Choose a supported document of 10 MB or smaller.'); return; }
    const normalizedFormat = ({pdf:'PDF',doc:'DOCX',docx:'DOCX',ppt:'PPTX',pptx:'PPTX'})[ext];
    if (format !== 'Other' && format !== normalizedFormat) { setMessage(`The selected file is ${ext.toUpperCase()}, but the chosen format is ${format}. Please make them match.`); return; }
    submit.disabled = true;
    setMessage('Uploading file and publishing resource…');
    let uploadedPath = null;
    try {
      const { supabase, user } = await window.NotesPixData.requireUser();
      const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-100) || `resource.${ext}`;
      uploadedPath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: storageError } = await supabase.storage.from('studyhub-resources').upload(uploadedPath, file, {
        cacheControl: '3600', upsert: false, contentType: mimeByExt[ext]
      });
      if (storageError) throw storageError;
      const { data, error: dbError } = await supabase.from('resources').insert({
        owner_id: user.id, title, description, subject, format: normalizedFormat, file_path: uploadedPath, education_level: education, academic_level: academic, semester: education === 'college' ? semester : null, unit_topic: unitTopic || null
      }).select('id').single();
      if (dbError) {
        await supabase.storage.from('studyhub-resources').remove([uploadedPath]);
        throw dbError;
      }
      try { await supabase.from('activity_log').insert({ user_id: user.id, action: 'Resource published', resource_id: data.id }); } catch (_) {}
      setMessage('Resource uploaded and published successfully!', 'success');
      window.location.href = 'my-uploads.html';
    } catch (error) {
      console.error('NotesPix resource upload failed:', error);
      setMessage(window.NotesPixData?.friendlyError(error, 'Upload failed. Please check your file and connection, then try again.'));
      submit.disabled = false;
    }
  });
})();
