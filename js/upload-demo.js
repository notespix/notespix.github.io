// Frontend-only upload flow: stores resource metadata, not the actual file.
(() => {
  const form = document.getElementById('resourceUploadForm');
  if (!form) return;
  const userKey = 'studyhub-demo-user';
  const uploadsKey = 'studyhub-demo-uploads';
  const activityKey = 'studyhub-activity';
  const notice = document.getElementById('uploadAuthNotice');
  const message = document.getElementById('uploadFormMessage');
  const fileInput = document.getElementById('resourceFile');
  const fileLabel = document.getElementById('selectedFileLabel');
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const allowedExtensions = new Set(['pdf','doc','docx','ppt','pptx','zip','txt']);
  const extensionOf = name => (String(name || '').split('.').pop() || '').toLowerCase();
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) { return []; } };
  const user = (() => { try { return JSON.parse(localStorage.getItem(userKey) || 'null'); } catch (_) { return null; } })();
  if (!user || !user.name) notice.hidden = false;
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) { fileLabel.textContent = 'No file selected. Actual file storage will be connected in the backend phase.'; return; }
    const ext = extensionOf(file.name);
    if (!allowedExtensions.has(ext)) { fileInput.setCustomValidity('Unsupported file type. Choose PDF, DOC, DOCX, PPT, PPTX, ZIP, or TXT.'); fileInput.reportValidity(); fileLabel.textContent = 'Unsupported file type.'; return; }
    if (file.size > MAX_FILE_SIZE) { fileInput.setCustomValidity('File must be 10 MB or smaller.'); fileInput.reportValidity(); fileLabel.textContent = 'File is too large (10 MB maximum).'; return; }
    fileInput.setCustomValidity('');
    fileLabel.textContent = `Selected: ${file.name} (${Math.ceil(file.size / 1024)} KB). File is not sent or stored in this demo.`;
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!user || !user.name) {
      message.textContent = 'Please log in first. After login, the dashboard will open; then return to Upload from My Uploads.';
      return;
    }
    const title = document.getElementById('resourceTitle').value.trim();
    const subject = document.getElementById('resourceSubject').value.trim();
    const format = document.getElementById('resourceFormat').value;
    if (!title || !subject || !format) { message.textContent = 'Please fill in the title, subject, and file format.'; return; }
    const file = fileInput.files?.[0];
    if (file) {
      const ext = extensionOf(file.name);
      if (!allowedExtensions.has(ext)) { fileInput.setCustomValidity('Unsupported file type. Choose PDF, DOC, DOCX, PPT, PPTX, ZIP, or TXT.'); fileInput.reportValidity(); return; }
      if (file.size > MAX_FILE_SIZE) { fileInput.setCustomValidity('File must be 10 MB or smaller.'); fileInput.reportValidity(); return; }
      fileInput.setCustomValidity('');
      const formatMap = {pdf:'PDF',doc:'DOCX',docx:'DOCX',ppt:'PPTX',pptx:'PPTX',zip:'ZIP',txt:'Other'};
      if (format !== 'Other' && formatMap[ext] !== format) { message.textContent = `The selected file is .${ext}, but the chosen format is ${format}. Please make them match.`; return; }
    }
    const uploads = read(uploadsKey);
    const entry = { id: Date.now() + Math.floor(Math.random()*1000), title, subject, format, fileName: file?.name || '', status: 'Approved', moderationFeedback: 'Published automatically in this frontend demo. Community members can report this resource if they notice a problem.', at: new Date().toISOString() };
    uploads.unshift(entry);
    try {
      localStorage.setItem(uploadsKey, JSON.stringify(uploads.slice(0, 100)));
      const activity = read(activityKey);
      activity.unshift({ id: Date.now() + 1, type: 'Resource published (demo)', title, icon: '↥', at: entry.at });
      localStorage.setItem(activityKey, JSON.stringify(activity.slice(0, 100)));
    } catch (_) {
      message.textContent = 'Could not save this demo entry in browser storage. Please check browser storage settings.';
      return;
    }
    message.textContent = 'Resource published in this browser demo. The actual file has not been uploaded or stored.';
    window.location.replace('my-uploads.html');
  });
})();
