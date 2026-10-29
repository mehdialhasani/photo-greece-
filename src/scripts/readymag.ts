import Lenis from 'lenis';

// Re-implements the Readymag animation types used in the export:
// scroll (tied to scroll position), click (toggles on each click), load and hover.

type Anim = {
  type: 'scroll' | 'click' | 'load' | 'hover';
  trigger: string[];
  duration: number;
  delay: number;
  ease: string;
  speed: number;
  start: 'top' | 'center' | 'bottom';
  offset: number;
  move: [number, number] | null;
  opacity: [number, number] | null;
  rotate: [number, number] | null;
};

type Animated = {
  el: HTMLElement;
  top: number; // layout y in design pixels
  fixed: boolean;
  anims: Anim[];
  values: number[]; // current progress 0..1 per animation (before easing)
  hoverable: boolean;
};

const DESIGN_WIDTH = 1024;
const MAX_WIDTH = 3600;
// Scroll distance (design px) an opacity-only scroll animation takes at speed 1
const FADE_DISTANCE = 250;

const easings: Record<string, (t: number) => number> = {
  'ease-both': (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  'ease-out': (t) => 1 - Math.pow(1 - t, 3),
  'ease-in': (t) => t * t * t,
};
const ease = (name: string, t: number) => (easings[name] ?? ((x: number) => x))(t);
const clamp = (t: number) => Math.min(1, Math.max(0, t));

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let scale = 1;
const items: Animated[] = [];
const tweens = new Map<string, { item: Animated; index: number; from: number; to: number; start: number; duration: number }>();

function updateScale() {
  scale = Math.min(window.innerWidth, MAX_WIDTH) / DESIGN_WIDTH;
  document.documentElement.style.setProperty('--s', String(scale));
}

function tween(item: Animated, index: number, to: number, delay = 0) {
  const anim = item.anims[index];
  const duration = reduceMotion ? 0 : anim.duration * 1000;
  tweens.set(`${item.el.id}:${index}`, {
    item,
    index,
    from: item.values[index],
    to,
    start: performance.now() + delay * 1000,
    duration,
  });
}

function scrollProgress(item: Animated, anim: Anim, viewerTop: number) {
  const vh = window.innerHeight;
  const line = anim.start === 'bottom' ? vh : anim.start === 'center' ? vh / 2 : 0;
  const elementTop = viewerTop + item.top * scale;
  // Elements already past their start point on load begin animating from the top of the page
  const start = Math.max(0, elementTop - line + anim.offset * scale);
  const length = anim.move ? Math.hypot(...anim.move) : FADE_DISTANCE;
  const distance = (Math.max(length, 1) * scale) / (anim.speed || 1);
  return clamp((window.scrollY - start) / distance);
}

function render(now: number) {
  for (const [key, t] of tweens) {
    const p = t.duration ? clamp((now - t.start) / t.duration) : now >= t.start ? 1 : 0;
    t.item.values[t.index] = t.from + (t.to - t.from) * p;
    if (p >= 1) tweens.delete(key);
  }

  const viewer = document.querySelector<HTMLElement>('.viewer');
  const viewerTop = (viewer?.getBoundingClientRect().top ?? 0) + window.scrollY;

  for (const item of items) {
    let opacity = 1;
    let x = 0;
    let y = 0;
    let rotate = 0;
    item.anims.forEach((anim, i) => {
      if (anim.type === 'scroll' && !item.fixed) item.values[i] = scrollProgress(item, anim, viewerTop);
      const t = ease(anim.ease, item.values[i]);
      if (anim.opacity) opacity *= anim.opacity[0] + (anim.opacity[1] - anim.opacity[0]) * t;
      if (anim.move) {
        x += anim.move[0] * t;
        y += anim.move[1] * t;
      }
      if (anim.rotate) rotate += anim.rotate[0] + (anim.rotate[1] - anim.rotate[0]) * t;
    });
    item.el.style.opacity = String(opacity);
    item.el.style.transform = `translate(${x}px, ${y}px)${rotate ? ` rotate(${rotate}deg)` : ''}`;
    // Hidden elements must not block clicks, unless hovering is what reveals them
    item.el.style.pointerEvents = opacity < 0.05 && !item.hoverable ? 'none' : '';
  }
}

function setupLightbox() {
  const box = document.querySelector<HTMLElement>('.lightbox');
  const img = box?.querySelector('img');
  if (!box || !img) return;
  document.querySelectorAll<HTMLElement>('[data-lightbox]').forEach((el) => {
    el.addEventListener('click', () => {
      img.src = el.dataset.lightbox!;
      box.hidden = false;
    });
  });
  const close = () => (box.hidden = true);
  box.addEventListener('click', close);
  window.addEventListener('keydown', (e) => e.key === 'Escape' && close());
}

function setupVideos() {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target as HTMLElement;
      const id = el.dataset.youtube;
      el.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&playsinline=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="Video"></iframe>`;
      observer.unobserve(el);
    }
  }, { rootMargin: '200px' });
  document.querySelectorAll<HTMLElement>('[data-youtube]').forEach((el) => observer.observe(el));
}

export function init() {
  updateScale();
  window.addEventListener('resize', updateScale);

  document.querySelectorAll<HTMLElement>('[data-anims]').forEach((el) => {
    const anims: Anim[] = JSON.parse(el.dataset.anims!);
    items.push({
      el,
      top: parseFloat(el.style.top),
      fixed: !!el.closest('.fixed-layer'),
      anims,
      values: anims.map(() => 0),
      hoverable: anims.some((a) => a.type === 'hover'),
    });
  });

  for (const item of items) {
    const id = item.el.id.slice(2);
    item.anims.forEach((anim, i) => {
      if (anim.type === 'load') tween(item, i, 1, anim.delay);
      if (anim.type === 'hover') {
        item.el.addEventListener('mouseenter', () => tween(item, i, 1));
        item.el.addEventListener('mouseleave', () => tween(item, i, 0));
      }
      if (anim.type === 'click') {
        const triggers = anim.trigger.length ? anim.trigger : [id];
        let open = false;
        for (const triggerId of triggers) {
          const trigger = document.getElementById(`w-${triggerId}`);
          if (!trigger) continue;
          trigger.dataset.clickable = '';
          trigger.addEventListener('click', () => {
            open = !open;
            tween(item, i, open ? 1 : 0);
          });
        }
      }
    });
  }

  setupLightbox();
  setupVideos();

  if (!reduceMotion) {
    const lenis = new Lenis();
    const raf = (time: number) => {
      lenis.raf(time);
      render(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  } else {
    const raf = (time: number) => {
      render(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }
}
