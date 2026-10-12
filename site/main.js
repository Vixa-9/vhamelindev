const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lang = () => root.lang === 'en' ? 'en' : 'fr';

function store(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}

/* Thème : transition circulaire depuis le bouton quand le navigateur gère les View Transitions */
const themeBtn = document.getElementById('themeToggle');
themeBtn.addEventListener('click', () => {
  const next = root.dataset.theme === 'light' ? 'dark' : 'light';
  const apply = () => { root.dataset.theme = next; store('theme', next); };

  if (!document.startViewTransition || reduceMotion) { apply(); return; }

  const r = themeBtn.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  const transition = document.startViewTransition(apply);
  transition.finished.catch(() => {});
  transition.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 650, easing: 'cubic-bezier(.2, .7, .2, 1)', pseudoElement: '::view-transition-new(root)' },
    );
  }).catch(() => {}); // transition interrompue : le thème est déjà appliqué
});

/* Langue */
document.getElementById('langToggle').addEventListener('click', () => {
  root.lang = lang() === 'fr' ? 'en' : 'fr';
  store('lang', root.lang);
  document.title = lang() === 'fr' ? 'Victor Hamelin | Ingénieur logiciel' : 'Victor Hamelin | Software Engineer';
});

/* Défilement doux vers les sections : durée selon la distance, accélération puis freinage */
const easeInOutQuart = t => t < .5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2;
let scrollFrame = null;

function smoothScrollTo(targetY) {
  cancelAnimationFrame(scrollFrame);
  const startY = window.scrollY;
  const distance = targetY - startY;
  if (reduceMotion || Math.abs(distance) < 2) { window.scrollTo(0, targetY); return; }

  const duration = Math.min(1400, 500 + Math.abs(distance) * 0.25);
  const start = performance.now();
  (function step(now) {
    const t = Math.min(1, (now - start) / duration);
    window.scrollTo(0, startY + distance * easeInOutQuart(t));
    if (t < 1) scrollFrame = requestAnimationFrame(step);
  })(start);
}

// L'utilisateur reprend la main dès qu'il fait défiler lui-même
['wheel', 'touchstart', 'keydown'].forEach(evt =>
  window.addEventListener(evt, () => cancelAnimationFrame(scrollFrame), { passive: true }));

document.querySelectorAll('a[href^="#"]:not(.skip-link)').forEach(link => {
  link.addEventListener('click', e => {
    const id = link.getAttribute('href');
    const target = id === '#top' ? document.body : document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const navH = document.getElementById('nav').offsetHeight;
    const y = id === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY - navH + 1;
    smoothScrollTo(Math.max(0, y));
    history.replaceState(null, '', id);
  });
});

/* Navigation */
const nav = document.getElementById('nav');
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  nav.classList.toggle('is-scrolled', window.scrollY > 20);
}, { passive: true });

function setMenu(open) {
  navLinks.classList.toggle('is-open', open);
  burger.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('menu-open', open);
}
burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

// Lien actif selon la section visible, souligné par un indicateur qui glisse
const indicator = navLinks.querySelector('.nav__indicator');

function moveIndicator() {
  const active = navLinks.querySelector('a.is-active');
  if (!active || getComputedStyle(burger).display !== 'none') { indicator.style.setProperty('--o', 0); return; }
  indicator.style.setProperty('--x', `${active.offsetLeft}px`);
  indicator.style.setProperty('--w', `${active.offsetWidth}px`);
  indicator.style.setProperty('--o', 1);
}

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    navLinks.querySelectorAll('a').forEach(a => {
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id);
    });
    moveIndicator();
  });
}, { rootMargin: '-45% 0px -50% 0px' });
window.addEventListener('resize', moveIndicator);
// En haut de page, aucun lien n'est actif
new IntersectionObserver(([e]) => {
  if (!e.isIntersecting) return;
  navLinks.querySelectorAll('a').forEach(a => a.classList.remove('is-active'));
  moveIndicator();
}, { threshold: .5 }).observe(document.getElementById('top'));
navLinks.querySelectorAll('a').forEach(a => {
  const section = document.querySelector(a.getAttribute('href'));
  if (section) sectionObserver.observe(section);
});

/* Accueil : la grille s'éclaire autour du curseur */
const hero = document.getElementById('top');
if (!reduceMotion) {
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--mx', `${e.clientX - r.left}px`);
    hero.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
}

/* Cartes projets : position du curseur pour le halo de bordure */
document.querySelectorAll('.project').forEach(card => {
  card.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
});

/* Compétences : rang de chaque puce pour l'apparition en cascade */
document.querySelectorAll('.skill-row .chips').forEach(list => {
  [...list.children].forEach((li, i) => li.style.setProperty('--i', i));
});

/* Apparition au défilement */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* Galeries d'images */
document.querySelectorAll('[data-gallery]').forEach(gallery => {
  const track = gallery.querySelector('.gallery__track');
  const slides = track.children;
  const prev = gallery.querySelector('.gallery__btn--prev');
  const next = gallery.querySelector('.gallery__btn--next');
  const dotsBox = gallery.querySelector('.gallery__dots');
  let index = 0;

  const dots = [...slides].map((_, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.setAttribute('aria-label', `Image ${i + 1}`);
    d.addEventListener('click', () => go(i));
    dotsBox.appendChild(d);
    return d;
  });

  function go(i) {
    index = Math.max(0, Math.min(slides.length - 1, i));
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d, j) => d.classList.toggle('is-active', j === index));
    prev.disabled = index === 0;
    next.disabled = index === slides.length - 1;
  }

  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));

  // Balayage tactile
  let startX = null;
  gallery.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  gallery.addEventListener('touchend', e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    startX = null;
  });

  go(0);
});

/* Frise : remplissage au défilement */
const timeline = document.getElementById('timeline');
const fill = document.getElementById('timelineFill');
const line = timeline.querySelector('.timeline__line');
const items = timeline.querySelectorAll('.tl-item');
let fillHeight = 0;
let fillFrame = null;

function fillTarget() {
  const r = line.getBoundingClientRect();
  return Math.min(r.height, Math.max(0, window.innerHeight * 0.6 - r.top));
}

function animateFill() {
  const goal = fillTarget();
  fillHeight += (goal - fillHeight) * (reduceMotion ? 1 : .1);
  if (Math.abs(goal - fillHeight) < .5) { fillHeight = goal; fillFrame = null; }
  else fillFrame = requestAnimationFrame(animateFill);
  fill.style.height = `${fillHeight}px`;

  const lineTop = line.getBoundingClientRect().top;
  items.forEach(item => {
    const dotTop = item.querySelector('.tl-dot').getBoundingClientRect().top - lineTop;
    item.classList.toggle('is-reached', fillHeight >= dotTop);
  });
}
const startFill = () => { if (!fillFrame) fillFrame = requestAnimationFrame(animateFill); };
window.addEventListener('scroll', startFill, { passive: true });
window.addEventListener('resize', startFill);
startFill();

/* Formulaire de contact */
const form = document.getElementById('contactForm');
const statusEl = document.getElementById('formStatus');
const MSG = {
  fr: { invalid: 'Merci de remplir correctement tous les champs.', sending: 'Envoi en cours...', ok: 'Votre message a bien été envoyé.', tooMany: 'Trop de messages envoyés, réessayez dans quelques minutes.', error: "L'envoi a échoué. Vous pouvez m'écrire à vhamelindev@gmail.com." },
  en: { invalid: 'Please fill in all fields correctly.', sending: 'Sending...', ok: 'Your message has been sent.', tooMany: 'Too many messages sent, please try again in a few minutes.', error: 'Sending failed. You can email me at vhamelindev@gmail.com.' },
};
const CONTACT_TIMEOUT = 20_000;

function setStatus(text, kind = '') {
  statusEl.textContent = text;
  statusEl.className = 'form__status' + (kind ? ` is-${kind}` : '');
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  const m = MSG[lang()];

  let valid = true;
  form.querySelectorAll('.field').forEach(field => {
    const input = field.querySelector('input, textarea');
    const ok = input.value.trim() !== '' && input.checkValidity();
    field.classList.toggle('is-invalid', !ok);
    if (!ok) valid = false;
  });
  if (!valid) { setStatus(m.invalid, 'error'); return; }

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  setStatus(m.sending);

  // Sans réponse au bout de 20 s, on abandonne plutôt que de laisser le visiteur attendre
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONTACT_TIMEOUT);

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      form.reset();
      setStatus(m.ok, 'ok');
    } else if (res.status === 400) {
      setStatus(m.invalid, 'error');
    } else if (res.status === 429) {
      setStatus(m.tooMany, 'error');
    } else {
      setStatus(m.error, 'error');
    }
  } catch (err) {
    setStatus(m.error, 'error'); // réseau coupé ou délai dépassé
  } finally {
    clearTimeout(timer);
    button.disabled = false;
  }
});

form.addEventListener('input', e => e.target.closest('.field')?.classList.remove('is-invalid'));

document.getElementById('year').textContent = new Date().getFullYear();
