// Contrôle tactile : doigt principal (déplacement), second doigt (spéciale), tapotements
import { canvas, view } from './renderer.js';

export const input = {
  down: false, id: null,
  x: 0, y: 0,           // position du doigt (unités)
  sx: 0, sy: 0, st: 0,  // début du contact
  dx: 0, dy: 0,         // déplacement depuis la dernière frame
  justDown: false, justUp: false,
  taps: [],             // tapotements courts {x,y}
  second: false,        // tapotement d'un second doigt
  keys: {},
};

function toWorld(e) {
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left) / view.unit, (e.clientY - r.top) / view.unit];
}

export function initInput() {
  const el = canvas;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const [x, y] = toWorld(e);
    if (input.id === null) {
      input.id = e.pointerId; input.down = true;
      input.x = x; input.y = y; input.sx = x; input.sy = y; input.st = performance.now();
      input.justDown = true;
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    } else {
      input.second = true;
    }
  }, { passive: false });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerId !== input.id) return;
    e.preventDefault();
    const [x, y] = toWorld(e);
    input.dx += x - input.x; input.dy += y - input.y;
    input.x = x; input.y = y;
  }, { passive: false });
  const up = (e) => {
    if (e.pointerId !== input.id) return;
    const [x, y] = toWorld(e);
    const dt = performance.now() - input.st;
    if (dt < 260 && Math.hypot(x - input.sx, y - input.sy) < 14) input.taps.push({ x, y });
    input.id = null; input.down = false; input.justUp = true;
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  // Empêcher zoom / défilement parasite sur iOS (le canvas capte tout le geste)
  const stop = (e) => { if (e.cancelable) e.preventDefault(); };
  el.addEventListener('touchstart', stop, { passive: false });
  el.addEventListener('touchmove', stop, { passive: false });
  el.addEventListener('touchend', stop, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => {
    if (!e.target.closest || !e.target.closest('.scroll, .modal, input[type=range]')) e.preventDefault();
  }, { passive: false });
  window.addEventListener('keydown', (e) => { input.keys[e.code] = true; });
  window.addEventListener('keyup', (e) => { input.keys[e.code] = false; });
}

export function endFrameInput() {
  input.justDown = false; input.justUp = false;
  input.taps.length = 0; input.second = false;
  input.dx = 0; input.dy = 0;
}
export function resetInput() { input.down = false; input.id = null; endFrameInput(); }
