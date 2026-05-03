/* ══════════════════════════════
   NAV — GSAP accordion + greeting + search
   curio/js/nav.js
══════════════════════════════ */

const nav        = document.getElementById('card-nav');
const cards      = document.querySelectorAll('.nav-card');
const navCards   = document.getElementById('navCards');
const menuToggle = document.getElementById('menuToggle');
const menuIcon   = document.getElementById('menuIcon');
const closeIcon  = document.getElementById('closeIcon');
const greetEl    = document.getElementById('navGreeting');

let isOpen = false;
let tl     = null;

/* ── Time-based greeting ── */
function setGreeting() {
  const h = new Date().getHours();
  let text, emoji;
  if (h < 12)      { text = 'Good Morning';   emoji = '☀️'; }
  else if (h < 17) { text = 'Good Afternoon'; emoji = '🌤️'; }
  else             { text = 'Good Evening';   emoji = '🌙'; }
  if (greetEl) {
    greetEl.querySelector('.greet-emoji').textContent = emoji;
    greetEl.querySelector('.greet-text').textContent  = text;
  }
}
setGreeting();

/* ── GSAP accordion ── */
function buildTimeline() {
  gsap.set(nav,   { height: 62, overflow: 'hidden' });
  gsap.set(cards, { y: 18, opacity: 0 });

  tl = gsap.timeline({ paused: true });
  tl.to(nav,   { height: 260, duration: .42, ease: 'power3.out' });
  tl.to(cards, { y: 0, opacity: 1, duration: .3, ease: 'power3.out', stagger: .06 }, '-=.18');
}
buildTimeline();

menuToggle.addEventListener('click', () => {
  if (!isOpen) {
    isOpen = true;
    navCards.classList.add('open');
    nav.classList.add('open');
    menuIcon.style.display  = 'none';
    closeIcon.style.display = 'block';
    tl.play();
  } else {
    tl.reverse().eventCallback('onReverseComplete', () => {
      isOpen = false;
      navCards.classList.remove('open');
      nav.classList.remove('open');
      menuIcon.style.display  = 'block';
      closeIcon.style.display = 'none';
    });
  }
});

/* Close when clicking outside */
document.addEventListener('click', (e) => {
  if (isOpen && !nav.contains(e.target) && !menuToggle.contains(e.target)) {
    menuToggle.click();
  }
});

/* Subtle nav shadow on scroll */
window.addEventListener('scroll', () => {
  const container = document.getElementById('card-nav-container');
  if (window.scrollY > 60) {
    container.style.transform = 'translateX(-50%) translateY(-2px)';
  } else {
    container.style.transform = 'translateX(-50%)';
  }
}, { passive: true });
