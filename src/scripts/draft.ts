import Lenis from 'lenis';

// Interactions for the redesigned drafts: reveal on scroll, the sign lettering, parallax,
// reading progress, the menu bar, info toggles, carousel counter, count-up facts,
// lightbox, the regrowth timeline and lazily embedded video.

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (t: number) => Math.min(1, Math.max(0, t));

function setupReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px' },
  );
  document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
}

function setupLightbox() {
  const box = document.querySelector<HTMLElement>('.lightbox');
  const img = box?.querySelector('img');
  if (!box || !img) return;
  document.querySelectorAll<HTMLImageElement>('[data-zoom]').forEach((el) => {
    el.addEventListener('click', () => {
      img.src = el.dataset.zoom!;
      img.alt = el.alt;
      box.hidden = false;
      requestAnimationFrame(() => box.classList.add('open'));
    });
  });
  const close = () => {
    box.classList.remove('open');
    setTimeout(() => (box.hidden = true), 250);
  };
  box.addEventListener('click', close);
  window.addEventListener('keydown', (e) => e.key === 'Escape' && close());
}

function setupInfo() {
  document.querySelectorAll<HTMLButtonElement>('.info-toggle').forEach((button) => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      button.closest('.frame')?.classList.toggle('open', open);
    });
  });
}

// One step is active at a time: the last text that has passed the middle of the screen.
// Clicking the photo or a dash jumps to the next or that step.
// On phones the photo sticks to the top, so texts count from its lower edge
let scrollTo = (el: HTMLElement, offset: number) => window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - offset, behavior: reduceMotion ? 'auto' : 'smooth' });
const phone = window.matchMedia('(max-width: 767px)');
const timelines: (() => void)[] = [];
function setupTimeline() {
  document.querySelectorAll<HTMLElement>('[data-timeline]').forEach((timeline) => {
    const photos = [...timeline.querySelectorAll<HTMLElement>('.timeline-stage img')];
    const dots = [...timeline.querySelectorAll<HTMLElement>('.timeline-dots button')];
    const steps = [...timeline.querySelectorAll<HTMLElement>('.timeline-step')];
    const stage = timeline.querySelector<HTMLElement>('.timeline-stage')!;
    const top = () => (phone.matches ? stage.getBoundingClientRect().bottom : window.innerHeight * 0.3);
    const go = (i: number) => scrollTo(steps[i], top());
    let current = -1;
    const show = (index: number) => {
      if (index === current) return;
      current = index;
      photos.forEach((p, i) => p.classList.toggle('on', i === index));
      steps.forEach((s, i) => s.classList.toggle('on', i === index));
      dots.forEach((d, i) => (i === index ? d.setAttribute('aria-current', 'step') : d.removeAttribute('aria-current')));
    };
    dots.forEach((dot, i) => dot.addEventListener('click', (e) => {
      e.stopPropagation();
      go(i);
    }));
    stage.addEventListener('click', () => go((current + 1) % steps.length));
    timelines.push(() => {
      const line = phone.matches ? top() + window.innerHeight * 0.12 : window.innerHeight * 0.62;
      let index = 0;
      steps.forEach((step, i) => {
        if (step.getBoundingClientRect().top < line) index = i;
      });
      show(index);
    });
  });
}

function setupCarousel() {
  document.querySelectorAll<HTMLElement>('.carousel').forEach((carousel) => {
    const track = carousel.querySelector<HTMLElement>('.carousel-track')!;
    const count = carousel.querySelector<HTMLElement>('.carousel-count')!;
    const items = [...track.children] as HTMLElement[];
    track.addEventListener('scroll', () => {
      const center = track.scrollLeft + track.clientWidth / 2;
      let current = 0;
      items.forEach((item, i) => {
        if (item.offsetLeft <= center) current = i;
      });
      count.textContent = `${current + 1} / ${items.length}`;
    }, { passive: true });
  });
}

function setupCount() {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      const el = entry.target as HTMLElement;
      const text = el.dataset.count!;
      const match = text.match(/[\d.,]+/);
      if (!match || reduceMotion) continue;
      const target = parseFloat(match[0].replace(/\./g, '').replace(',', '.'));
      const decimals = match[0].includes(',') ? 1 : 0;
      const start = performance.now();
      const step = (now: number) => {
        const t = clamp((now - start) / 1400);
        const value = target * (1 - Math.pow(1 - t, 3));
        el.textContent = text.replace(match[0], value.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((el) => observer.observe(el));
}

function setupVideos() {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target as HTMLElement;
      const id = el.dataset.youtube;
      el.insertAdjacentHTML(
        'beforeend',
        `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&playsinline=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="${el.dataset.title}"></iframe>`,
      );
      observer.unobserve(el);
    }
  }, { rootMargin: '200px' });
  document.querySelectorAll<HTMLElement>('[data-youtube]').forEach((el) => observer.observe(el));
}

// Scroll-linked values, written as CSS custom properties so the styles decide what moves
function update() {
  const vh = window.innerHeight;
  const root = document.documentElement;
  const max = root.scrollHeight - vh;
  root.style.setProperty('--read', String(max > 0 ? clamp(window.scrollY / max) : 0));

  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (hero) root.style.setProperty('--hero', String(clamp(window.scrollY / hero.offsetHeight)));

  // The letters complete the sign between the photo entering the lower part of the screen
  // and its centre reaching the upper third
  document.querySelectorAll<HTMLElement>('[data-sign]').forEach((sign) => {
    const rect = sign.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    sign.style.setProperty('--p', reduceMotion ? '1' : String(clamp((vh * 0.95 - center) / (vh * 0.55))));
  });

  document.querySelectorAll<HTMLElement>('[data-drift]').forEach((drift) => {
    const rect = drift.getBoundingClientRect();
    drift.style.setProperty('--d', String(clamp((vh - rect.top) / (vh + rect.height)) * 2 - 1));
  });

  timelines.forEach((check) => check());
}

let lastY = 0;
function updateBar() {
  const y = window.scrollY;
  const bar = document.querySelector<HTMLElement>('.bar');
  if (!bar) return;
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  bar.classList.toggle('solid', y > (hero?.offsetHeight ?? 0) - 80);
  // Hide the bar while reading downwards, bring it back on the way up
  if (Math.abs(y - lastY) > 6) {
    bar.classList.toggle('hidden', y > lastY && y > 200);
    lastY = y;
  }
}

export function init() {
  setupReveal();
  setupLightbox();
  setupInfo();
  setupTimeline();
  setupCarousel();
  setupCount();
  setupVideos();

  const frame = () => {
    update();
    updateBar();
  };
  if (reduceMotion) {
    window.addEventListener('scroll', frame, { passive: true });
    window.addEventListener('resize', frame);
    frame();
    return;
  }
  const lenis = new Lenis({ lerp: 0.12 });
  scrollTo = (el, offset) => lenis.scrollTo(el, { offset: -offset });
  const raf = (time: number) => {
    lenis.raf(time);
    frame();
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}
