// NotesPix Phase 3 interactions. Frontend prototype only; no accounts or files are stored.
(() => {
  const toast = document.getElementById("phase3Toast");
  let toastTimer;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 3200);
  }
  function setMessage(element, message, type = "error") {
    if (!element) return;
    element.textContent = message;
    element.className = `form-message ${type}`;
  }
  document.querySelectorAll("[data-toggle-password]").forEach(button => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.togglePassword);
      if (!input) return;
      const visible = input.type === "password";
      input.type = visible ? "text" : "password";
      button.textContent = visible ? "Hide" : "Show";
      button.setAttribute("aria-label", visible ? "Hide password" : "Show password");
    });
  });

  const loginForm = document.getElementById("loginForm");
  const supabaseAuthEnabled = Boolean(window.studyHubSupabaseAuthEnabled);
  // If a signed-in demo user returns to the login page with Back/Forward, skip the stale login form.
  function redirectSignedInLoginPage() {
    if (!loginForm || supabaseAuthEnabled) return;
    try {
      const user = JSON.parse(localStorage.getItem("studyhub-demo-user") || "null");
      if (user && user.name) window.location.replace("dashboard.html");
    } catch (_) {}
  }
  redirectSignedInLoginPage();
  window.addEventListener("pageshow", event => {
    if (event.persisted) redirectSignedInLoginPage();
  });
  if (!supabaseAuthEnabled) loginForm?.addEventListener("submit", event => {
    event.preventDefault();
    const email = document.getElementById("loginEmail");
    const password = document.getElementById("loginPassword");
    const message = document.getElementById("loginMessage");
    if (!email.value.trim() || !email.checkValidity()) {
      setMessage(message, "Please enter a valid email address.");
      email.focus(); return;
    }
    if (!password.value || password.value.length < 6) {
      setMessage(message, "Please enter a password with at least 6 characters.");
      password.focus(); return;
    }
    const existing = (() => { try { return JSON.parse(localStorage.getItem("studyhub-demo-user") || "null"); } catch (_) { return null; } })();
    const guessedName = email.value.trim().split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, ch => ch.toUpperCase());
    localStorage.setItem("studyhub-demo-user", JSON.stringify({ name: existing?.email === email.value.trim() ? existing.name : guessedName || "Student", email: email.value.trim() }));
    setMessage(message, "Demo login successful! Opening your NotesPix dashboard…", "success");
    window.setTimeout(() => { window.location.replace("dashboard.html"); }, 500);
  });

  const signupForm = document.getElementById("signupForm");
  if (!supabaseAuthEnabled) signupForm?.addEventListener("submit", event => {
    event.preventDefault();
    const name = document.getElementById("signupName");
    const email = document.getElementById("signupEmail");
    const role = document.getElementById("signupRole");
    const password = document.getElementById("signupPassword");
    const confirm = document.getElementById("signupConfirm");
    const terms = document.getElementById("signupTerms");
    const message = document.getElementById("signupMessage");
    if (name.value.trim().length < 2) { setMessage(message, "Please enter your name."); name.focus(); return; }
    if (!email.checkValidity() || !email.value.trim()) { setMessage(message, "Please enter a valid email address."); email.focus(); return; }
    if (!role.value) { setMessage(message, "Please choose your learner type."); role.focus(); return; }
    if (password.value.length < 8) { setMessage(message, "Use at least 8 characters for your password."); password.focus(); return; }
    if (password.value !== confirm.value) { setMessage(message, "Your passwords don't match. Please check them."); confirm.focus(); return; }
    if (!terms.checked) { setMessage(message, "Please accept the Terms and Privacy Policy to continue."); terms.focus(); return; }
    localStorage.setItem("studyhub-demo-user", JSON.stringify({ name: name.value.trim(), email: email.value.trim(), role: role.value }));
    setMessage(message, "Demo profile created! Opening your NotesPix dashboard…", "success");
    window.setTimeout(() => { window.location.replace("dashboard.html"); }, 500);
  });

  if (!supabaseAuthEnabled) document.getElementById("forgotPassword")?.addEventListener("click", event => {
    event.preventDefault();
    showToast("Password reset will be available when authentication is connected.");
  });
  // Save state is keyed by stable resource identity, not title. Uploaded demo resources
  // use their upload ID so similarly named resources cannot inherit each other's state.
  function getCurrentResourceIdentity() {
    const params = new URLSearchParams(window.location.search);
    const uploadId = params.get("upload");
    return uploadId ? { id: String(uploadId), resourceKey: `upload:${uploadId}`, url: `resource-details.html?upload=${encodeURIComponent(uploadId)}` }
      : { id: "sample-computer-networks", resourceKey: "sample:computer-networks-unit-2", url: "resource-details.html" };
  }
  function getSavedItems() {
    try { const value = JSON.parse(localStorage.getItem("studyhub-saved-resources") || "[]"); return Array.isArray(value) ? value : []; }
    catch (_) { return []; }
  }
  function updateSaveButtonState() {
    const button = document.getElementById("saveResource");
    if (!button) return;
    const identity = getCurrentResourceIdentity();
    const saved = getSavedItems().some(item => item.resourceKey === identity.resourceKey || (!new URLSearchParams(window.location.search).has("upload") && !item.resourceKey && item.title === "Computer Networks — Unit 2 Notes"));
    button.setAttribute("aria-pressed", String(saved));
    button.classList.toggle("saved", saved);
    button.innerHTML = saved ? "<span>♥</span> Saved" : "<span>♡</span> Save";
  }
  document.getElementById("saveResource")?.addEventListener("click", event => {
    // Real Supabase resources are handled by community-resource.js. Keep this local demo handler only for the old sample page.
    if (new URLSearchParams(window.location.search).has("id")) return;
    const button = event.currentTarget;
    const title = document.querySelector(".detail-title-row h1")?.textContent.trim() || "Study resource";
    const identity = getCurrentResourceIdentity();
    const key = "studyhub-saved-resources";
    let savedItems = getSavedItems();
    const existing = savedItems.findIndex(item => item.resourceKey === identity.resourceKey || (!new URLSearchParams(window.location.search).has("upload") && !item.resourceKey && item.title === "Computer Networks — Unit 2 Notes"));
    if (existing >= 0) {
      savedItems.splice(existing, 1);
      button.setAttribute("aria-pressed", "false"); button.classList.remove("saved"); button.innerHTML = "<span>♡</span> Save";
      showToast("Removed from Saved Notes.");
    } else {
      const item = { id: identity.id, resourceKey: identity.resourceKey, title, subject: document.querySelector(".detail-tags .detail-tag")?.textContent.trim() || "Study resource", format: document.querySelector(".detail-tags .neutral-tag")?.textContent.replace(/document/i, "").trim() || "PDF", url: identity.url, savedAt: new Date().toISOString() };
      savedItems.unshift(item); button.setAttribute("aria-pressed", "true"); button.classList.add("saved"); button.innerHTML = "<span>♥</span> Saved";
      const activityKey = "studyhub-activity"; let activities = [];
      try { activities = JSON.parse(localStorage.getItem(activityKey) || "[]"); } catch (_) {}
      activities.unshift({id:Date.now(),type:"Saved resource",title,icon:"♡",at:new Date().toISOString()});
      localStorage.setItem(activityKey, JSON.stringify(activities.slice(0,100)));
      showToast("Saved to your library.");
    }
    localStorage.setItem(key, JSON.stringify(savedItems));
  });
  updateSaveButtonState();
  document.getElementById("downloadResource")?.addEventListener("click", () => showToast("No file is attached yet. Real downloads will be connected in a later phase."));
  document.getElementById("reportResource")?.addEventListener("click", () => showToast("Resource reporting will be available in a later phase."));
  document.querySelectorAll("[data-demo-action]").forEach(link => link.addEventListener("click", event => {
    event.preventDefault(); showToast(`${link.dataset.demoAction} will be available in a later phase.`);
  }));
})();
