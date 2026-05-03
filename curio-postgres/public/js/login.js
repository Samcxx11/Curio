/* ══════════════════════════════
   LOGIN MODAL
   curio/js/login.js
══════════════════════════════ */
const overlay = document.getElementById('login-overlay');

function openLogin(tab) {
  if (!overlay) return;
  overlay.classList.add('open');
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  if (tab) switchTab(tab);
}

function closeLogin() {
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.style.display = 'none';
  document.body.style.overflow = '';
}

/* Tab switcher — drives the two static panels */
function switchTab(tab) {
  // Update tab button states
  document.querySelectorAll('.login-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });

  const loginPanel    = document.getElementById('loginPanel');
  const registerPanel = document.getElementById('registerPanel');

  if (tab === 'register') {
    if (loginPanel)    loginPanel.style.display    = 'none';
    if (registerPanel) registerPanel.style.display = '';
  } else {
    if (loginPanel)    loginPanel.style.display    = '';
    if (registerPanel) registerPanel.style.display = 'none';
  }

  // Animate form fields
  if (typeof gsap !== 'undefined') {
    gsap.from(
      '.auth-panel[style=""] .form-field, .auth-panel:not([style]) .form-field,' +
      '.auth-panel[style=""] .form-row,   .auth-panel:not([style]) .form-row,' +
      '.auth-panel[style=""] .btn-login-submit, .auth-panel:not([style]) .btn-login-submit,' +
      '.auth-panel[style=""] .btn-google,  .auth-panel:not([style]) .btn-google',
      { y: 8, opacity: 0, duration: 0.35, stagger: 0.06, ease: 'power2.out' }
    );
  }
}

/* Wire tab click events */
document.querySelectorAll('.login-tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

/* Google Auth — both buttons trigger the same OAuth flow */
function triggerGoogleAuth() {
  window.location.href = '/api/auth/google';
}

document.addEventListener('DOMContentLoaded', () => {
  const btnGoogleLogin    = document.getElementById('btnGoogleLogin');
  const btnGoogleRegister = document.getElementById('btnGoogleRegister');
  if (btnGoogleLogin)    btnGoogleLogin.addEventListener('click', triggerGoogleAuth);
  if (btnGoogleRegister) btnGoogleRegister.addEventListener('click', triggerGoogleAuth);
});

/* Keyboard close */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLogin();
});

/* Expose to global scope for onclick in HTML */
window.openLogin  = openLogin;
window.closeLogin = closeLogin;
window.switchTab  = switchTab;
