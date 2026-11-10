/* Applies the mobile sign-in gate before first paint to avoid flashing protected content. */
if (window.matchMedia && window.matchMedia('(max-width: 767px)').matches) {
  document.documentElement.classList.add('mobile-auth-pending');
}
