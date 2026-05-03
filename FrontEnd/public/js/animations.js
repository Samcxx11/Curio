/* ══════════════════════════════
   ANIMATIONS + INTERACTIONS
   curio/js/animations.js
══════════════════════════════ */

/* ── Hero entry animations ── */
window.addEventListener('load', () => {
  gsap.from('.hero-badge',    { y: 24, opacity: 0, duration: .65, delay: .2,  ease: 'power3.out' });
  gsap.from('.hero-headline', { y: 44, opacity: 0, duration: .75, delay: .38, ease: 'power3.out' });
  gsap.from('.hero-sub',      { y: 22, opacity: 0, duration: .6,  delay: .56, ease: 'power3.out' });
  gsap.from('.hero-form',     { y: 22, opacity: 0, duration: .6,  delay: .72, ease: 'power3.out' });
  gsap.from('.hero-note',     { y: 10, opacity: 0, duration: .5,  delay: .86, ease: 'power3.out' });
  gsap.from('.hero-stat-row', { y: 10, opacity: 0, duration: .5,  delay: .95, ease: 'power3.out' });
  gsap.from('.hero-trust',    { y: 10, opacity: 0, duration: .5,  delay: 1.05, ease: 'power3.out' });
  animateScoreBars();
});

/* ── Intersection Observer scroll reveals ── */
function revealOnScroll(selector, staggerDelay = 0) {
  const els = document.querySelectorAll(selector);
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        gsap.to(entry.target, {
          y: 0, opacity: 1, duration: .6, delay: i * staggerDelay,
          ease: 'power3.out'
        });
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => {
    gsap.set(el, { y: 30, opacity: 0 });
    io.observe(el);
  });
}

revealOnScroll('.bento-card',  .08);
revealOnScroll('.how-step',    .1);
revealOnScroll('.testi-card',  .1);
revealOnScroll('.news-row',    .05);
revealOnScroll('.news-card',   .06);
revealOnScroll('.sidebar-card', .09);
revealOnScroll('.dash-stat',   .08);
revealOnScroll('.ps-item',     .06);

/* ── Score bar animations ── */
function animateScoreBars() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bar = entry.target;
        const target = bar.getAttribute('data-width') || '0%';
        gsap.to(bar, { width: target, duration: 1.2, ease: 'power3.out', delay: .2 });
        io.unobserve(bar);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.score-bar-fill').forEach(bar => {
    bar.style.width = '0%';
    io.observe(bar);
  });
}

/* ── News Slider ── */
const track    = document.getElementById('newsSliderTrack');
const btnPrev  = document.getElementById('sliderPrev');
const btnNext  = document.getElementById('sliderNext');
const dotsWrap = document.getElementById('sliderDots');

const CARD_WIDTH    = 280 + 16; // card + gap
const VISIBLE_COUNT = 3;        // approximate visible cards
let   currentSlide  = 0;

function getMaxSlide() {
  if (!track) return 0;
  const total = track.children.length;
  return Math.max(0, total - VISIBLE_COUNT);
}

function goToSlide(idx) {
  if (!track) return;
  const max = getMaxSlide();
  currentSlide = Math.max(0, Math.min(idx, max));
  gsap.to(track, { x: -currentSlide * CARD_WIDTH, duration: .5, ease: 'power3.out' });
  updateDots();
}

function updateDots() {
  if (!dotsWrap) return;
  const dots = dotsWrap.querySelectorAll('.slider-dot');
  dots.forEach((d, i) => d.classList.toggle('active', i === currentSlide));
}

if (btnNext) btnNext.addEventListener('click', () => goToSlide(currentSlide + 1));
if (btnPrev) btnPrev.addEventListener('click', () => goToSlide(currentSlide - 1));

/* Build slider dots */
function buildDots() {
  if (!track || !dotsWrap) return;
  const count = Math.min(track.children.length, 8);
  dotsWrap.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const d = document.createElement('div');
    d.className = 'slider-dot' + (i === 0 ? ' active' : '');
    d.addEventListener('click', () => goToSlide(i));
    dotsWrap.appendChild(d);
  }
}
buildDots();

/* Auto-advance */
let autoSlide = setInterval(() => {
  if (currentSlide >= getMaxSlide()) goToSlide(0);
  else goToSlide(currentSlide + 1);
}, 4000);

/* Pause on hover */
if (track) {
  track.addEventListener('mouseenter', () => clearInterval(autoSlide));
  track.addEventListener('mouseleave', () => {
    autoSlide = setInterval(() => {
      if (currentSlide >= getMaxSlide()) goToSlide(0);
      else goToSlide(currentSlide + 1);
    }, 4000);
  });
}

/* Touch/swipe support */
let touchStartX = 0;
if (track) {
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToSlide(currentSlide + 1);
      else goToSlide(currentSlide - 1);
    }
  }, { passive: true });
}

/* ── Show More toggle ── */
const showMoreBtn   = document.getElementById('showMoreBtn');
const hiddenRows    = document.querySelectorAll('.news-row.hidden-row');

if (showMoreBtn) {
  showMoreBtn.addEventListener('click', () => {
    const isExpanded = showMoreBtn.dataset.expanded === 'true';
    hiddenRows.forEach((row, i) => {
      if (!isExpanded) {
        row.style.display = 'grid';
        gsap.from(row, { y: 16, opacity: 0, duration: .45, delay: i * .06, ease: 'power3.out' });
      } else {
        row.style.display = 'none';
      }
    });
    showMoreBtn.dataset.expanded = !isExpanded;
    const label = showMoreBtn.querySelector('.show-more-label');
    if (label) label.textContent = isExpanded ? 'Show More Stories' : 'Show Less';
  });
}

/* ── Filter chips ── */
document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    /* Filter animation on rows */
    gsap.from('.news-row', { x: -10, opacity: 0, duration: .35, stagger: .04, ease: 'power2.out' });
  });
});

/* ── Quiz interaction ── */
const quizOptions = document.querySelectorAll('.quiz-option');
quizOptions.forEach(option => {
  option.addEventListener('click', () => {
    if (option.parentElement.querySelector('.correct, .wrong')) return; // already answered
    const isCorrect = option.dataset.correct === 'true';
    option.classList.add(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) {
      option.parentElement.querySelector('[data-correct="true"]')?.classList.add('correct');
    }
    /* Disable all options */
    option.parentElement.querySelectorAll('.quiz-option').forEach(o => {
      o.style.pointerEvents = 'none';
    });
    /* Animate result */
    gsap.from(option, { scale: .95, duration: .3, ease: 'power3.out' });
  });
});

/* ── Chatbot ── */
const chatTrigger = document.getElementById('chatbotTrigger');
const chatWindow  = document.getElementById('chatbotWindow');
const chatClose   = document.getElementById('chatbotClose');
const chatInput   = document.getElementById('chatInput');
const chatSend    = document.getElementById('chatSend');
const chatMsgs    = document.getElementById('chatMessages');

function openChat() {
  if (!chatWindow) return;
  chatWindow.classList.add('open');
  chatWindow.style.display = 'flex';
  chatInput?.focus();
}

function closeChat() {
  if (!chatWindow) return;
  gsap.to(chatWindow, {
    scale: .88, opacity: 0, duration: .22, ease: 'power2.in',
    onComplete: () => { chatWindow.style.display = 'none'; chatWindow.style.cssText = ''; }
  });
}

if (chatTrigger) chatTrigger.addEventListener('click', openChat);
if (chatClose)   chatClose.addEventListener('click', closeChat);

function appendMsg(text, role) {
  if (!chatMsgs) return;
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.textContent = text;
  chatMsgs.appendChild(div);
  chatMsgs.scrollTop = chatMsgs.scrollHeight;
}

/* sendMessage and event listeners are handled by api.js wireChatbot() */

/* ── Dashboard logout animation ── */
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    gsap.to('#dashboard', {
      opacity: 0, y: -20, duration: .4, ease: 'power3.in',
      onComplete: () => gsap.to('#dashboard', { opacity: 1, y: 0, duration: .4, delay: .2 })
    });
  });
}

/* ── Hero scroll parallax ── */
window.addEventListener('scroll', () => {
  const hero = document.getElementById('hero');
  if (!hero) return;
  const y = window.scrollY * .3;
  hero.style.backgroundPositionY = `${y}px`;
}, { passive: true });
