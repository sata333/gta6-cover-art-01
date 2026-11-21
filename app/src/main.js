// The editor: wires the controls to the cover state and redraws the live preview.
// Pick photos (upload, drag-and-drop, or the bundled samples), click a panel to select it,
// drag on the canvas to reposition its crop, scroll or use the slider to zoom, choose a
// layout and a colour grade, edit the caption, then export a PNG at a poster size.
// A ?shot= query sets up a fixed scene for screenshots instead (./shots.js).
import { createState, drawCover, panelRects, LAYOUTS, GRADES } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const state = createState();
let shotMode = false;

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  canvas.width = state.width;
  canvas.height = state.height;
  drawCover(canvas, state);
  if (!shotMode) drawSelection();
  syncControls();
}

// In the editor only: outline the selected panel so it is clear which crop drags and the
// zoom slider will move.
function drawSelection() {
  const rects = panelRects(state.width, state.height, state.layout);
  const r = rects[state.selected];
  if (!r) return;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.strokeStyle = '#ff2e88';
  ctx.lineWidth = Math.max(4, state.width * 0.005);
  ctx.setLineDash([state.width * 0.02, state.width * 0.012]);
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

function syncControls() {
  document.querySelectorAll('[data-layout]').forEach((b) =>
    b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-grade]').forEach((b) =>
    b.classList.toggle('active', b.dataset.grade === state.grade));
  $('zoom').value = state.slots[state.selected].zoom;
  $('fillall').checked = state.fillAll;
  $('panel-label').textContent = `Panel ${state.selected + 1} of ${LAYOUTS[state.layout].cells.length}`;
}

function assignPhoto(img) {
  const target = state.fillAll ? state.slots[0] : state.slots[state.selected];
  target.img = img;
  redraw();
}

function addSwatch(img, label) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'swatch';
  b.title = label;
  const thumb = document.createElement('img');
  thumb.src = img.src;
  thumb.alt = label;
  b.appendChild(thumb);
  b.addEventListener('click', () => assignPhoto(img));
  $('photos').appendChild(b);
}

async function addPhotoFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const img = await loadImage(URL.createObjectURL(file));
  addSwatch(img, file.name);
  assignPhoto(img);
  $('status').textContent = `Added ${file.name}`;
}

$('photo-file').addEventListener('change', (e) => {
  addPhotoFile(e.target.files[0]);
  e.target.value = '';
});

// Drag-and-drop anywhere on the stage adds the photo and assigns it.
const stage = $('stage');
['dragover', 'dragleave', 'drop'].forEach((name) =>
  stage.addEventListener(name, (e) => {
    e.preventDefault();
    stage.classList.toggle('dropping', name === 'dragover');
    if (name === 'drop') addPhotoFile(e.dataTransfer.files[0]);
  }));

document.querySelectorAll('[data-sample]').forEach((b) =>
  b.addEventListener('click', async () => assignPhoto(await loadImage(`samples/${b.dataset.sample}.jpg`))));

document.querySelectorAll('[data-layout]').forEach((b) =>
  b.addEventListener('click', () => {
    state.layout = b.dataset.layout;
    if (state.selected >= LAYOUTS[state.layout].cells.length) state.selected = 0;
    redraw();
  }));

document.querySelectorAll('[data-grade]').forEach((b) =>
  b.addEventListener('click', () => { state.grade = b.dataset.grade; redraw(); }));

$('fillall').addEventListener('change', (e) => { state.fillAll = e.target.checked; redraw(); });
$('caption').addEventListener('input', (e) => { state.caption = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('pos').addEventListener('change', (e) => { state.captionPos = e.target.value; redraw(); });
$('size').addEventListener('change', (e) => {
  const [w, h] = e.target.value.split('x').map(Number);
  state.width = w;
  state.height = h;
  redraw();
});
$('zoom').addEventListener('input', (e) => {
  state.slots[state.selected].zoom = Number(e.target.value);
  redraw();
});
$('clear-panel').addEventListener('click', () => {
  const slot = state.fillAll ? state.slots[0] : state.slots[state.selected];
  slot.img = null;
  redraw();
});

// Pointer work on the canvas: click selects a panel, drag pans its crop, wheel zooms it.
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width),
    y: (e.clientY - r.top) * (canvas.height / r.height),
  };
}
function panelAt(p) {
  const rects = panelRects(state.width, state.height, state.layout);
  return rects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const i = panelAt(p);
  if (i < 0) return;
  state.selected = i;
  drag = { x: p.x, y: p.y, moved: false };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const dx = p.x - drag.x;
  const dy = p.y - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
  if (!drag.moved) return;
  drag.x = p.x;
  drag.y = p.y;
  const slot = state.slots[state.selected];
  const img = state.fillAll ? state.slots[0].img : slot.img;
  if (!img) return;
  const r = panelRects(state.width, state.height, state.layout)[state.selected];
  const scale = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight) * slot.zoom;
  const slackX = img.naturalWidth * scale - r.w;
  const slackY = img.naturalHeight * scale - r.h;
  if (slackX > 0) slot.panX = clamp(slot.panX - (2 * dx) / slackX);
  if (slackY > 0) slot.panY = clamp(slot.panY - (2 * dy) / slackY);
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const slot = state.slots[state.selected];
  slot.zoom = Math.min(3, Math.max(1, slot.zoom * (e.deltaY < 0 ? 1.07 : 0.93)));
  redraw();
}, { passive: false });

function clamp(v) { return Math.min(1, Math.max(-1, v)); }

$('export').addEventListener('click', () => {
  const out = document.createElement('canvas');
  out.width = state.width;
  out.height = state.height;
  drawCover(out, state);
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${state.width}x${state.height}.png`;
    a.click();
    $('status').textContent = `Saved cover-${state.width}x${state.height}.png`;
  }, 'image/png');
});

// Applies a ?shot= scene: loads the sample into slot 1 (filling every panel), sets the
// requested layout/grade/caption/size, and for ?shot=cover hides the UI entirely.
async function applyShot(shot, q) {
  shotMode = true;
  const img = await loadImage(`samples/${q.get('photo') ?? 'pier'}.jpg`);
  state.slots[0].img = img;
  state.fillAll = true;
  if (q.get('caption') !== null) state.caption = q.get('caption');
  if (q.get('subtitle') !== null) state.subtitle = q.get('subtitle');
  if (q.get('layout') && LAYOUTS[q.get('layout')]) state.layout = q.get('layout');
  if (q.get('grade') && GRADES[q.get('grade')]) state.grade = q.get('grade');
  if (q.get('pos')) state.captionPos = q.get('pos');
  const size = /^(\d+)x(\d+)$/.exec(q.get('size') ?? '');
  if (size) { state.width = Number(size[1]); state.height = Number(size[2]); }
  $('caption').value = state.caption;
  $('subtitle').value = state.subtitle;
  $('pos').value = state.captionPos;
  if (shot === 'cover') document.body.classList.add('shot-cover');
  redraw();
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), applyShot);
} else {
  // Start on the pier sample so the first thing seen is a finished-looking cover.
  loadImage('samples/pier.jpg').then((img) => {
    state.slots[0].img = img;
    redraw();
  });
  redraw();
}
