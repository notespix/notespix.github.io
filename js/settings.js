/* NotesPix Settings — real theme, dashboard preferences, password and account actions. */
(() => {
  const sidebar = document.getElementById("dashboardSidebar");
  const menuToggle = document.getElementById("dashboardMenuToggle");
  const overlay = document.getElementById("dashboardOverlay");
  const toast = document.getElementById("dashboardToast");
  const PREF_KEY = "studyhub-dashboard-preferences";
  let toastTimer;
  let authClient = null;
  let signedInUser = null;

  const showToast = message => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 3000);
  };

  // Settings section navigation.
  const settingsLinks = [...document.querySelectorAll(".settings-nav-link[href^='#']")];
  const settingsSections = settingsLinks.map(link => document.querySelector(link.getAttribute("href"))).filter(Boolean);
  function setActiveSettingsLink(id) {
    settingsLinks.forEach(link => {
      const active = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }
  settingsLinks.forEach(link => link.addEventListener("click", event => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    history.replaceState(null, "", link.getAttribute("href"));
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSettingsLink(target.id);
  }));
  if ("IntersectionObserver" in window && settingsSections.length) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSettingsLink(visible.target.id);
    }, { rootMargin: "-12% 0px -65% 0px", threshold: [0, .15, .35, .6] });
    settingsSections.forEach(section => observer.observe(section));
  }
  const initialSection = location.hash.slice(1);
  if (settingsSections.some(section => section.id === initialSection)) setActiveSettingsLink(initialSection);

  // Appearance and dashboard preferences are synced to the signed-in Supabase account.
  function applyTheme(theme, persist = true) {
    const safeTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = safeTheme;
    document.documentElement.style.colorScheme = safeTheme;
    try { localStorage.setItem("studyhub-theme", safeTheme); } catch (_) {}
    document.querySelectorAll("[data-theme-toggle]").forEach(button => {
      const dark = safeTheme === "dark";
      button.setAttribute("aria-pressed", String(dark));
      button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      button.innerHTML = dark
        ? '<span class="theme-toggle-icon" aria-hidden="true">☀</span><span class="theme-toggle-label">Light mode</span>'
        : '<span class="theme-toggle-icon" aria-hidden="true">☾</span><span class="theme-toggle-label">Dark mode</span>';
    });
    document.querySelectorAll("[data-theme-status]").forEach(node => {
      node.textContent = safeTheme === "dark" ? "Dark mode is on" : "Light mode is on";
    });
    document.querySelectorAll("[data-select-theme]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.selectTheme === safeTheme));
    });
    if (persist) queueAccountMetadata({ studyhub_theme: safeTheme });
  }
  document.querySelectorAll("[data-select-theme]").forEach(button => {
    button.addEventListener("click", () => {
      const theme = button.dataset.selectTheme === "dark" ? "dark" : "light";
      applyTheme(theme);
      showToast(`${theme === "dark" ? "Dark" : "Light"} appearance saved.`);
    });
  });
  document.addEventListener("studyhub:theme-changed", event => {
    const theme = event.detail?.theme || document.documentElement.dataset.theme || "light";
    document.querySelectorAll("[data-select-theme]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.selectTheme === theme));
    });
    // The shared theme switcher emits this event after a header toggle.
    if (signedInUser) queueAccountMetadata({ studyhub_theme: theme });
  });

  // Preferences are stored in Supabase user metadata, with a local cache for instant rendering.
  function readPreferences() {
    const defaults = { showStudyTips: true, showWeeklyActivity: true };
    try {
      const parsed = JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
      return {
        showStudyTips: typeof parsed.showStudyTips === "boolean" ? parsed.showStudyTips : defaults.showStudyTips,
        showWeeklyActivity: typeof parsed.showWeeklyActivity === "boolean" ? parsed.showWeeklyActivity : defaults.showWeeklyActivity
      };
    } catch (_) { return defaults; }
  }
  let preferences = readPreferences();
  const tipsToggle = document.getElementById("prefStudyTips");
  const weeklyToggle = document.getElementById("prefWeeklyActivity");
  if (tipsToggle) tipsToggle.checked = preferences.showStudyTips;
  if (weeklyToggle) weeklyToggle.checked = preferences.showWeeklyActivity;

  let metadataQueue = Promise.resolve();
  function queueAccountMetadata(patch) {
    metadataQueue = metadataQueue.then(async () => {
      if (!authClient) authClient = getSupabase();
      const { data, error } = await authClient.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error("Please sign in again to save account settings.");
      signedInUser = data.user;
      const { error: updateError } = await authClient.auth.updateUser({
        data: { ...(signedInUser.user_metadata || {}), ...patch }
      });
      if (updateError) throw updateError;
    }).catch(error => {
      console.error("Could not sync NotesPix settings:", error);
      showToast(error.message || "Settings could not be synced to your account.");
    });
    return metadataQueue;
  }

  async function savePreferences() {
    preferences = {
      showStudyTips: Boolean(tipsToggle?.checked),
      showWeeklyActivity: Boolean(weeklyToggle?.checked)
    };
    try { localStorage.setItem(PREF_KEY, JSON.stringify(preferences)); } catch (_) {}
    await queueAccountMetadata({ studyhub_preferences: preferences });
    showToast("Dashboard preferences saved to your account.");
  }
  tipsToggle?.addEventListener("change", savePreferences);
  weeklyToggle?.addEventListener("change", savePreferences);

  // Signed-in account identity and security actions use the actual Supabase session.
  function getSupabase() {
    if (!window.supabase?.createClient || !window.STUDYHUB_SUPABASE_URL || !window.STUDYHUB_SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("NotesPix authentication is unavailable. Please refresh and try again.");
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
  const initials = name => String(name || "Student").trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map(part => part[0]).join("").toUpperCase() || "S";
  function paintIdentity(name, email) {
    const displayName = name || "Student";
    document.querySelectorAll("[data-profile-fullname]").forEach(node => node.textContent = displayName);
    document.querySelectorAll("[data-profile-initials]").forEach(node => node.textContent = initials(displayName));
    const accountName = document.getElementById("settingsAccountName");
    const accountEmail = document.getElementById("settingsAccountEmail");
    if (accountName) accountName.textContent = displayName;
    if (accountEmail) accountEmail.textContent = email || "";
  }
  async function loadAccount() {
    authClient = getSupabase();
    const { data, error } = await authClient.auth.getUser();
    if (error) throw error;
    signedInUser = data.user;
    if (!signedInUser) {
      window.location.replace("login.html");
      return;
    }
    const savedBrowserTheme = (() => {
      try { return localStorage.getItem("studyhub-theme"); } catch (_) { return null; }
    })();
    const remoteTheme = signedInUser.user_metadata?.studyhub_theme;
    // Browser theme is the shared preference across all NotesPix pages; only
    // fall back to account metadata when this browser has no saved choice yet.
    if (savedBrowserTheme === "dark" || savedBrowserTheme === "light") {
      applyTheme(savedBrowserTheme, false);
    } else if (remoteTheme === "dark" || remoteTheme === "light") {
      applyTheme(remoteTheme, false);
    }
    const remotePreferences = signedInUser.user_metadata?.studyhub_preferences;
    if (remotePreferences && typeof remotePreferences === "object") {
      preferences = {
        showStudyTips: typeof remotePreferences.showStudyTips === "boolean" ? remotePreferences.showStudyTips : true,
        showWeeklyActivity: typeof remotePreferences.showWeeklyActivity === "boolean" ? remotePreferences.showWeeklyActivity : true
      };
      if (tipsToggle) tipsToggle.checked = preferences.showStudyTips;
      if (weeklyToggle) weeklyToggle.checked = preferences.showWeeklyActivity;
      try { localStorage.setItem(PREF_KEY, JSON.stringify(preferences)); } catch (_) {}
    }
    let displayName = signedInUser.user_metadata?.full_name || "";
    if (!displayName) {
      try {
        const { data: profile, error: profileError } = await authClient.from("profiles")
          .select("full_name").eq("id", signedInUser.id).maybeSingle();
        if (!profileError && profile?.full_name) displayName = profile.full_name;
      } catch (_) {}
    }
    displayName = displayName || signedInUser.email?.split("@")[0] || "Student";
    paintIdentity(displayName, signedInUser.email || "");
    try {
      localStorage.setItem("studyhub-demo-user", JSON.stringify({
        id: signedInUser.id, name: displayName, email: signedInUser.email || "",
        role: signedInUser.user_metadata?.role || "other"
      }));
    } catch (_) {}
  }

  const passwordForm = document.getElementById("passwordChangeForm");
  const passwordMessage = document.getElementById("passwordChangeMessage");
  const savePasswordButton = document.getElementById("savePasswordButton");
  const setPasswordMessage = (text, state = "") => {
    if (!passwordMessage) return;
    passwordMessage.textContent = text;
    passwordMessage.dataset.state = state;
    passwordMessage.hidden = !text;
  };
  document.getElementById("showPasswordForm")?.addEventListener("click", () => {
    if (passwordForm) {
      passwordForm.hidden = !passwordForm.hidden;
      if (!passwordForm.hidden) document.getElementById("newAccountPassword")?.focus();
    }
  });
  document.getElementById("cancelPasswordForm")?.addEventListener("click", () => {
    passwordForm?.reset();
    if (passwordForm) passwordForm.hidden = true;
    setPasswordMessage("");
  });
  passwordForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const newPassword = document.getElementById("newAccountPassword")?.value || "";
    const confirmPassword = document.getElementById("confirmAccountPassword")?.value || "";
    if (newPassword.length < 8) {
      setPasswordMessage("Use at least 8 characters for your new password.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("The passwords do not match. Please check them.", "error");
      return;
    }
    if (!savePasswordButton) return;
    savePasswordButton.disabled = true;
    savePasswordButton.textContent = "Updating…";
    try {
      if (!authClient) authClient = getSupabase();
      const { error } = await authClient.auth.updateUser({ password: newPassword });
      if (error) throw error;
      passwordForm.reset();
      passwordForm.hidden = true;
      setPasswordMessage("");
      showToast("Your password has been updated.");
    } catch (error) {
      setPasswordMessage(error.message || "Could not update your password. Please try again.", "error");
    } finally {
      savePasswordButton.disabled = false;
      savePasswordButton.textContent = "Update password";
    }
  });

  document.getElementById("settingsSignOut")?.addEventListener("click", async () => {
    const button = document.getElementById("settingsSignOut");
    button.disabled = true;
    button.textContent = "Signing out…";
    try {
      if (!authClient) authClient = getSupabase();
      const { error } = await authClient.auth.signOut();
      if (error) throw error;
      try { localStorage.removeItem("studyhub-demo-user"); } catch (_) {}
      window.location.replace("index.html");
    } catch (error) {
      showToast(error.message || "Could not sign out. Please try again.");
      button.disabled = false;
      button.textContent = "Sign out";
    }
  });

  loadAccount().catch(error => {
    console.error("Could not load NotesPix account settings:", error);
    const name = document.getElementById("settingsAccountName");
    const email = document.getElementById("settingsAccountEmail");
    if (name) name.textContent = "Account unavailable";
    if (email) email.textContent = error.message || "Please refresh or sign in again.";
  });
})();
