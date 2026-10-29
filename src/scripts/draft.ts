import Lenis from 'lenis';

// Interactions for the redesigned drafts: reveal on scroll, the sign lettering, parallax,
// reading progress, the menu bar, info toggles, carousel counter, count-up facts,
// lightbox, the regrowth timeline, the sign close-up, satellite maps and lazily embedded video.

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
      timeline.classList.toggle('end', index === steps.length - 1);
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

function setupSign() {
  document.querySelectorAll<HTMLElement>('[data-sign]').forEach((sign) => {
    const button = sign.querySelector<HTMLButtonElement>('.sign-photo')!;
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(open));
      const text = open ? sign.dataset.back! : sign.dataset.detail!;
      button.setAttribute('aria-label', text);
      sign.classList.toggle('detail', open);
      sign.querySelector('.sign-hint')!.textContent = text;
    });
  });
}

// Satellite tiles from Esri World Imagery with place names on top. Leaflet and the tiles only
// load once a map comes near the screen. When most of it is visible it flies from the wide view
// into the area; the button flies again.
type MapView = { center: [number, number]; zoom: number; label: string };
function setupMaps() {
  const maps = [...document.querySelectorAll<HTMLElement>('[data-map]')];
  const load = new IntersectionObserver(async (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      load.unobserve(entry.target);
      const el = entry.target as HTMLElement;
      const { from, to, pin } = JSON.parse(el.dataset.map!) as { from: MapView; to: MapView; pin?: [number, number] };
      const L = (await import('leaflet')).default;
      const map = L.map(el.querySelector<HTMLElement>('.map-canvas')!, {
        zoomControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomSnap: 0,
      }).setView(from.center, from.zoom);
      map.attributionControl.setPrefix(false);
      const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services';
      L.tileLayer(`${esri}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, {
        maxZoom: 18,
        attribution: 'Satellitenbild: Esri, Maxar, Earthstar Geographics',
      }).addTo(map);
      L.tileLayer(`${esri}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 18 }).addTo(map);
      if (pin) L.marker(pin, { icon: L.divIcon({ className: 'map-pin', iconSize: [20, 20] }), keyboard: false, interactive: false }).addTo(map);

      const label = el.querySelector<HTMLElement>('.map-label')!;
      const again = el.querySelector<HTMLButtonElement>('.map-again')!;
      const fly = () => {
        again.hidden = true;
        label.textContent = from.label;
        map.setView(from.center, from.zoom, { animate: false });
        if (reduceMotion) map.setView(to.center, to.zoom, { animate: false });
        else map.flyTo(to.center, to.zoom, { duration: 6, easeLinearity: 0.15 });
        map.once('moveend', () => {
          label.textContent = to.label;
          again.hidden = false;
        });
      };
      again.addEventListener('click', fly);
      // Start once most of the map is on screen
      const start = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        start.disconnect();
        setTimeout(fly, 400);
      }, { threshold: 0.6 });
      start.observe(el);
    }
  }, { rootMargin: '400px' });
  maps.forEach((el) => load.observe(el));
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
      // German numbers group with "." and use "," for decimals, English the other way round
      const english = document.documentElement.lang === 'en';
      const [group, decimal] = english ? [',', '.'] : ['.', ','];
      const target = parseFloat(match[0].split(group).join('').replace(decimal, '.'));
      const decimals = match[0].includes(decimal) ? 1 : 0;
      const start = performance.now();
      const step = (now: number) => {
        const t = clamp((now - start) / 1400);
        const value = target * (1 - Math.pow(1 - t, 3));
        el.textContent = text.replace(match[0], value.toLocaleString(english ? 'en-GB' : 'de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((el) => observer.observe(el));
}

// YouTube only loads after a click, so no data goes to YouTube before the reader wants the video
function setupVideos() {
  document.querySelectorAll<HTMLElement>('[data-youtube]').forEach((el) => {
    el.querySelector('.video-play')?.addEventListener('click', () => {
      const id = el.dataset.youtube;
      el.insertAdjacentHTML(
        'beforeend',
        `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&playsinline=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="${el.dataset.title}"></iframe>`,
      );
      el.querySelector('.video-play')?.remove();
    });
  });
}

// Scroll-linked values, written as CSS custom properties so the styles decide what moves.
// Set on the elements themselves, not on <html>, so a frame only restyles what moves.
// Elements are looked up once and the work only runs when the scroll position or window changes.
type Scroller = { el: HTMLElement; prop: string; value: (rect: DOMRect, vh: number) => number };
const scrollers: Scroller[] = [];
let bar: HTMLElement | null = null;
let hero: HTMLElement | null = null;

function collect() {
  bar = document.querySelector<HTMLElement>('.bar');
  hero = document.querySelector<HTMLElement>('[data-hero]');
  // The letters complete the sign between the photo entering the lower part of the screen
  // and its centre reaching the upper third
  document.querySelectorAll<HTMLElement>('[data-sign]').forEach((el) =>
    scrollers.push({ el, prop: '--p', value: (rect, vh) => (reduceMotion ? 1 : clamp((vh * 0.95 - rect.top - rect.height / 2) / (vh * 0.55))) }));
  document.querySelectorAll<HTMLElement>('[data-drift]').forEach((el) =>
    scrollers.push({ el, prop: '--d', value: (rect, vh) => clamp((vh - rect.top) / (vh + rect.height)) * 2 - 1 }));
  document.querySelectorAll<HTMLElement>('[data-scrollzoom]').forEach((el) =>
    scrollers.push({ el, prop: '--z', value: (rect, vh) => clamp((vh - rect.top) / (vh + rect.height)) }));
}

function update() {
  const vh = window.innerHeight;
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - vh;
  bar?.style.setProperty('--read', (max > 0 ? clamp(y / max) : 0).toFixed(4));
  if (hero && y < hero.offsetHeight * 1.2) hero.style.setProperty('--hero', clamp(y / hero.offsetHeight).toFixed(4));

  for (const s of scrollers) {
    const rect = s.el.getBoundingClientRect();
    // Off screen nothing moves
    if (rect.bottom < -vh * 0.2 || rect.top > vh * 1.2) continue;
    s.el.style.setProperty(s.prop, s.value(rect, vh).toFixed(4));
  }

  timelines.forEach((check) => check());
}

let lastY = 0;
function updateBar() {
  const y = window.scrollY;
  if (!bar) return;
  bar.classList.toggle('solid', y > (hero?.offsetHeight ?? 0) - 80);
  // Hide the bar while reading downwards, bring it back on the way up
  if (Math.abs(y - lastY) > 6) {
    bar.classList.toggle('hidden', y > lastY && y > 200);
    lastY = y;
  }
}

// A link from the other story opens this one at the top, also where the browser
// would otherwise keep the old scroll position. Back and reload keep their position.
function startAtTop() {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (location.hash || (nav && nav.type !== 'navigate')) return false;
  window.scrollTo(0, 0);
  return true;
}

export function init() {
  const top = startAtTop();
  collect();
  setupReveal();
  setupLightbox();
  setupInfo();
  setupTimeline();
  setupSign();
  setupMaps();
  setupCarousel();
  setupCount();
  setupVideos();

  let seenY = -1;
  let seenH = -1;
  const frame = (force = false) => {
    if (!force && window.scrollY === seenY && window.innerHeight === seenH) return;
    seenY = window.scrollY;
    seenH = window.innerHeight;
    update();
    updateBar();
  };
  if (reduceMotion) {
    window.addEventListener('scroll', () => frame(), { passive: true });
    window.addEventListener('resize', () => frame(true));
    frame(true);
    return;
  }
  const lenis = new Lenis({ lerp: 0.12 });
  if (top) lenis.scrollTo(0, { immediate: true, force: true });
  scrollTo = (el, offset) => lenis.scrollTo(el, { offset: -offset });
  window.addEventListener('resize', () => frame(true));
  const raf = (time: number) => {
    lenis.raf(time);
    frame();
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}
