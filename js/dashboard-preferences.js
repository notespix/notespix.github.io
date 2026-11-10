/* Applies account-synced NotesPix dashboard preferences. */
(async () => {
  const defaults = { showStudyTips: true, showWeeklyActivity: true };
  let prefs = { ...defaults };
  try {
    const cached = JSON.parse(localStorage.getItem("notespix-preferences") || "{}");
    if (typeof cached.showStudyTips === "boolean") prefs.showStudyTips = cached.showStudyTips;
    if (typeof cached.showWeeklyActivity === "boolean") prefs.showWeeklyActivity = cached.showWeeklyActivity;
  } catch (_) {}

  /* Render cached values immediately to avoid a flash while the account loads. */
  function apply() {
    const tips = document.querySelector(".dashboard-tip");
    const weekly = document.querySelector(".weekly-panel");
    if (tips) tips.style.display = prefs.showStudyTips ? "" : "none";
    if (weekly) weekly.style.display = prefs.showWeeklyActivity ? "" : "none";
  }
  apply();

  try {
    if (!window.NotesPixData?.client) return;
    const { data, error } = await window.NotesPixData.client().auth.getUser();
    if (error || !data.user) return;
    const remote = data.user.user_metadata?.notespix_preferences;
    if (remote && typeof remote === "object") {
      prefs = {
        showStudyTips: typeof remote.showStudyTips === "boolean" ? remote.showStudyTips : true,
        showWeeklyActivity: typeof remote.showWeeklyActivity === "boolean" ? remote.showWeeklyActivity : true
      };
      try { localStorage.setItem("notespix-preferences", JSON.stringify(prefs)); } catch (_) {}
      apply();
    }
  } catch (error) {
    console.warn("Could not load account dashboard preferences; using cached preferences.", error);
  }
})();
