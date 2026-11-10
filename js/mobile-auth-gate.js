/* Mobile-only sign-in gate. Desktop browsing remains unchanged. */
(() => {
  const isPhoneOrTablet = () => window.matchMedia('(max-width: 767px)').matches;
  const path = window.location.pathname.toLowerCase();
  const authPage = path.endsWith('/login.html') || path.endsWith('/signup.html');
  const publicLegalPage = path.endsWith('/terms.html') || path.endsWith('/privacy-policy.html');
  if (!isPhoneOrTablet() || authPage || publicLegalPage) return;

  const reveal = () => document.documentElement.classList.remove('mobile-auth-pending');
  const redirectToLogin = () => window.location.replace(new URL('login.html', window.location.href).href);

  try {
    if (!window.NotesPixData?.client) {
      reveal();
      return;
    }
    window.NotesPixData.client().auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      if (!data.session?.user) redirectToLogin();
      else reveal();
    }).catch(error => {
      console.error('NotesPix mobile auth check failed:', error);
      reveal();
    });
  } catch (error) {
    console.error('NotesPix mobile auth gate could not start:', error);
    reveal();
  }
})();
