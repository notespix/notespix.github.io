// NotesPix shared homepage interactions (no demo resource data).
const toast = document.getElementById("toast");
let toastTimer;
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3600);
}
const year = document.getElementById("currentYear");
if (year) year.textContent = new Date().getFullYear();
