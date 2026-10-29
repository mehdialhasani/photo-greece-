import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Menu toggle
const toggle = document.querySelector<HTMLButtonElement>('.menu__toggle');
const links = document.getElementById('menu-links');
toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  if (links) links.hidden = open;
});

if (!reduceMotion) {
  // Smooth scrolling, synced with ScrollTrigger
  const lenis = new Lenis();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // data-reveal: fade/slide in when the element enters the viewport.
  // Optional: data-reveal="up|left|right|fade", data-duration, data-delay (seconds)
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    const dir = el.dataset.reveal || 'up';
    const offset = { up: { y: 60 }, left: { x: -60 }, right: { x: 60 }, fade: {} }[dir] ?? { y: 60 };
    gsap.from(el, {
      opacity: 0,
      ...offset,
      duration: Number(el.dataset.duration ?? 1),
      delay: Number(el.dataset.delay ?? 0),
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  // data-parallax="0.2": moves the element against the scroll by the given factor
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const speed = Number(el.dataset.parallax || 0.2);
    gsap.to(el, {
      yPercent: -100 * speed,
      ease: 'none',
      scrollTrigger: { trigger: el.parentElement ?? el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
}
