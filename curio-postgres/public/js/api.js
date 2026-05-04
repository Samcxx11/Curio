/* ══ Curio API Client ══ */

const API = '/api';

// ── Verify News API ───────────────────────
async function verifyNews() {
  const url = document.querySelector('.hero-input').value;
  console.log('Verifying news URL:', url);
  if (!url) { alert('Please enter a news URL or headline.'); return; }
  const result = await fetch(`http://localhost:3000/api/analyze-url/analyze-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    });
  const data = await result.json();
  console.log('Received scores:', data);
  const { title, scores } = data.data;
  return { title, scores };
}

// ── Auth helpers ──────────────────────────────────────────────
function getToken() { return localStorage.getItem('curio_token'); }
function setToken(t) { localStorage.setItem('curio_token', t); }
function getUser()  { const u = localStorage.getItem('curio_user'); return u ? JSON.parse(u) : null; }
function setUser(u) { localStorage.setItem('curio_user', JSON.stringify(u)); }
function clearAuth() { localStorage.removeItem('curio_token'); localStorage.removeItem('curio_user'); }

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers };
  const res = await fetch(API + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ── Auth API ──────────────────────────────────────────────────
async function apiLogin(email, password) {
  const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  setToken(data.token); setUser(data.user);
  return data.user;
}

async function apiRegister(fields) {
  const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(fields) });
  setToken(data.token); setUser(data.user);
  return data.user;
}

function apiLogout() { clearAuth(); updateAuthUI(); }

// ── News API ──────────────────────────────────────────────────
async function fetchNews(category = 'All', page = 1, limit = 6) {
  return apiFetch(`/news?category=${category}&page=${page}&limit=${limit}`);
}

async function fetchCategories() { return apiFetch('/news/categories'); }

async function bookmarkNews(id) {
  if (!getToken()) { openLogin('login'); return; }
  return apiFetch(`/news/bookmark/${id}`, { method: 'POST' });
}

// ── UI: Update nav based on auth state ────────────────────────
function updateAuthUI() {
  const user = getUser();
  console.log('Updating auth UI, user:', user);
  const loginBtn = document.querySelector('.btn-login');
  const ctaBtn   = document.querySelector('.btn-nav-cta');
  const logoutBtn = document.getElementById('logoutBtn');

  if (user) {
    if (loginBtn)  loginBtn.textContent = user.name.split(' ')[0];
    if (ctaBtn)    ctaBtn.style.display = 'none';
    if (logoutBtn) { logoutBtn.style.display = 'inline-flex'; logoutBtn.onclick = apiLogout; }
    // Show welcome toast
    const toast = document.getElementById('authToast');
    if (toast && !sessionStorage.getItem('welcomed')) {
      toast.textContent = `Welcome back, ${user.name.split(' ')[0]}! 👋`;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
      sessionStorage.setItem('welcomed', '1');
    }
  } else {
    if (loginBtn)  loginBtn.textContent = 'Login';
    if (ctaBtn)    ctaBtn.style.display = '';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}

// ── UI: Load real news into news section ──────────────────────
let currentPage = 1;
let currentCategory = 'All';

function validityLabel(v) {
  if (v >= 80) return { text: 'Verified ✓', cls: 'valid-high' };
  if (v >= 50) return { text: 'Uncertain', cls: 'valid-mid' };
  return { text: 'Likely False ✗', cls: 'valid-low' };
}

// ── Ask Curio AI (from news cards or suggestion chips) ────────
function askCurio(question) {
  // Open chatbot window
  const chatWindow  = document.getElementById('chatbotWindow');
  const chatTrigger = document.getElementById('chatbotTrigger');
  if (chatWindow)  chatWindow.classList.add('open');
  if (chatTrigger) chatTrigger.style.display = 'none';

  // Inject the question into the input and fire
  const chatInput = document.getElementById('chatInput');
  const chatSend  = document.getElementById('chatSend');
  if (chatInput) {
    chatInput.value = question;
    chatInput.focus();
    chatSend?.click();
  }
}
window.askCurio = askCurio;

function renderNewsCards(news, container, append = false) {
  if (!append) container.innerHTML = '';
  news.forEach(item => {
    const { text, cls } = validityLabel(item.validity);
    const card = document.createElement('div');
    card.className = 'news-card';
    card.innerHTML = `
      <div class="news-card-img" style="background-image:url('${item.image}')">
        <span class="news-validity ${cls}">${text}</span>
      </div>
      <div class="news-card-body">
        <span class="news-cat-tag">${item.category}</span>
        <h3 class="news-card-title">${item.title}</h3>
        <p class="news-card-summary">${item.summary}</p>
        <div class="news-card-meta">
          <span>${item.source}</span>
          <div style="display:flex;gap:.5rem;align-items:center">
            <button class="btn-summarize" onclick="askCurio('Summarize this article: ${item.title.replace(/'/g, "\'")} ')" title="Ask AI to summarize">✨ Summarize</button>
            <button class="btn-bookmark" onclick="bookmarkNews('${item.id}')" title="Bookmark">🔖</button>
          </div>
        </div>
      </div>`;
    container.appendChild(card);
  });
}

async function loadNews(append = false) {
  const container = document.getElementById('newsCardGrid') || document.querySelector('.news-grid');
  if (!container) return;
  try {
    const { news } = await fetchNews(currentCategory, currentPage);
    renderNewsCards(news, container, append);
  } catch (e) { console.error('News load error:', e); }
}

async function loadCategories() {
  const bar = document.getElementById('newsCategoryBar') || document.querySelector('.category-bar');
  if (!bar) return;
  try {
    const cats = await fetchCategories();
    bar.innerHTML = cats.map(c =>
      `<button class="cat-btn${c === currentCategory ? ' active' : ''}" data-cat="${c}">${c}</button>`
    ).join('');
    bar.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentCategory = btn.dataset.cat;
        currentPage = 1;
        bar.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadNews();
      });
    });
  } catch (e) { console.error('Category load error:', e); }
}

// ── Login/Register form wiring ────────────────────────────────
function wireAuthForms() {
  const loginForm    = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginErr     = document.getElementById('loginError');
  const regErr       = document.getElementById('registerError');

  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const email    = loginForm.querySelector('[name=email]')?.value || loginForm.querySelector('#loginEmail')?.value;
      const password = loginForm.querySelector('[name=password]')?.value || loginForm.querySelector('#loginPassword')?.value;
      const btn = loginForm.querySelector('button[type=submit], .btn-login-submit');
      btn && (btn.textContent = 'Logging in…');
      try {
        await apiLogin(email, password);
        updateAuthUI();
        closeLogin();
      } catch (err) {
        if (loginErr) { loginErr.textContent = err.message; loginErr.style.display = 'block'; }
        else alert(err.message);
      } finally { btn && (btn.textContent = 'Login to Curio'); }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name     = registerForm.querySelector('[name=name]')?.value || registerForm.querySelector('#regName')?.value;
      const email    = registerForm.querySelector('[name=email]')?.value || registerForm.querySelector('#regEmail')?.value;
      const password = registerForm.querySelector('[name=password]')?.value || registerForm.querySelector('#regPassword')?.value;
      const phone    = registerForm.querySelector('[name=phone]')?.value || '';
      const btn = registerForm.querySelector('button[type=submit], .btn-login-submit');
      btn && (btn.textContent = 'Creating account…');
      try {
        await apiRegister({ name, email, password, phone });
        updateAuthUI();
        closeLogin();
      } catch (err) {
        if (regErr) { regErr.textContent = err.message; regErr.style.display = 'block'; }
        else alert(err.message);
      } finally { btn && (btn.textContent = 'Create Account'); }
    });
  }
}

// ── Chatbot: wire verify call ─────────────────────────────────
function wireChatbot() {
  const chatInput = document.getElementById('chatInput');
  const chatSend  = document.getElementById('chatSend');
  const chatMsgs  = document.getElementById('chatMessages');
  if (!chatMsgs) return;

  // Conversation history sent to the server each turn for multi-turn context
  let chatHistory = [];

  function addMsg(text, cls) {
    const d = document.createElement('div');
    d.className = `chat-msg ${cls}`;
    d.textContent = text;
    chatMsgs.appendChild(d);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
    return d;
  }

  function setInputState(disabled) {
    if (chatInput)  chatInput.disabled  = disabled;
    if (chatSend)   chatSend.disabled   = disabled;
  }

  async function sendMessage() {
    const text = chatInput?.value.trim();
    if (!text) return;

    chatInput.value = '';
    addMsg(text, 'user');
    const loadingEl = addMsg('Thinking…', 'bot loading');
    setInputState(true);

    try {
      const res  = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text, history: chatHistory }),
      });

      const data = await res.json();
      loadingEl.remove();

      if (!res.ok) {
        addMsg(data.message || 'Something went wrong. Please try again.', 'bot error');
        return;
      }

      addMsg(data.reply, 'bot');
      // Update history for next turn
      chatHistory = data.history || [];

    } catch {
      loadingEl.remove();
      addMsg('Could not reach the server. Please check your connection.', 'bot error');
    } finally {
      setInputState(false);
      chatInput?.focus();
    }
  }

  chatSend?.addEventListener('click', sendMessage);
  chatInput?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(); });
}

// ── Google OAuth token pickup ─────────────────────────────────
function showToast(msg, duration = 4000) {
  const toast = document.getElementById('authToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

function pickupOAuthToken() {
  const params = new URLSearchParams(window.location.search);
  const token  = params.get('token');
  const error  = params.get('error');

  if (token) {
    setToken(token);
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({ id: payload.id, name: payload.name, email: payload.email });
    } catch {}
    window.history.replaceState({}, '', '/');
    updateAuthUI();
  }

  if (error) {
    window.history.replaceState({}, '', '/');
    const msgs = {
      oauth_not_configured: 'Google sign-in is not set up yet. Please use email/password.',
      oauth_failed:         'Google sign-in failed. Please try again or use email/password.',
    };
    showToast(msgs[error] || 'Sign-in error. Please try again.');
    openLogin('login');
  }
}

// ── Check server OAuth status and disable Google buttons if not configured ──
async function checkOAuthStatus() {
  try {
    const res  = await fetch('/api/auth/status');
    const data = await res.json();
    if (!data.googleOAuth) {
      document.querySelectorAll('#btnGoogleLogin, #btnGoogleRegister').forEach(btn => {
        btn.disabled = true;
        btn.title    = 'Google sign-in is not configured on this server';
        btn.style.opacity = '0.45';
        btn.style.cursor  = 'not-allowed';
        // Replace click handler to show friendly message instead of 503
        btn.onclick = (e) => {
          e.preventDefault();
          showToast('Google sign-in is not set up yet. Use email/password instead.');
        };
      });
    }
  } catch {
    // Server not reachable — leave buttons as-is
  }
}

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  pickupOAuthToken();
  updateAuthUI();
  wireAuthForms();
  wireChatbot();
  checkOAuthStatus();
  loadCategories();
  loadNews();

  // Show More button
  const showMore = document.getElementById('showMoreBtn');
  if (showMore) {
    showMore.addEventListener('click', () => {
      currentPage++;
      loadNews(true);
    });
  }
});
