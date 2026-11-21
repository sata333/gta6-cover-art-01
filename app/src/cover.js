// The cover renderer: a multi-panel poster collage in the style of classic game-cover art —
// photos packed into white-guttered panels (some spanning), a strong colour grade over the
// whole thing, and a huge bold caption with a heavy outline. Everything is drawn with plain
// canvas calls: no images, fonts or libraries are loaded, so it works fully offline.
//
// A "slot" is one panel's photo plus its crop: { img, panX, panY, zoom } with pan in [-1, 1]
// (0 = centred) and zoom >= 1. The state also carries layout, grade, caption, subtitle,
// caption position, output size and whether one photo fills every panel.

// Panel maps as [x, y, w, h] fractions of the framed area. Classic is the six-panel poster
// grid: a tall hero panel, two small panels, a wide panel, and a split bottom row.
export const LAYOUTS = {
  solo: { label: 'Solo', cells: [[0, 0, 1, 1]] },
  duo: { label: 'Duo', cells: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]] },
  trio: {
    label: 'Trio',
    cells: [[0, 0, 0.58, 1], [0.58, 0, 0.42, 0.5], [0.58, 0.5, 0.42, 0.5]],
  },
  quad: {
    label: 'Quad',
    cells: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
  },
  classic: {
    label: 'Classic',
    cells: [
      [0, 0, 0.34, 0.62], [0.34, 0, 0.33, 0.34], [0.67, 0, 0.33, 0.34],
      [0.34, 0.34, 0.66, 0.28],
      [0, 0.62, 0.62, 0.38], [0.62, 0.62, 0.38, 0.38],
    ],
  },
};

export const GRADES = {
  sunset: { label: 'Vice Sunset' },
  neon: { label: 'Neon Night' },
  day: { label: 'Clean Day' },
};

// Default crops per slot, so a single photo spread across the panels already shows a
// different slice in each one instead of the same centre crop six times.
const SLOT_DEFAULTS = [
  { panX: 0, panY: 0, zoom: 1.05 },
  { panX: -0.45, panY: -0.2, zoom: 1.35 },
  { panX: 0.45, panY: -0.1, zoom: 1.4 },
  { panX: 0.1, panY: 0.25, zoom: 1.3 },
  { panX: -0.2, panY: 0.1, zoom: 1.2 },
  { panX: 0.25, panY: -0.3, zoom: 1.55 },
];

export function createState() {
  return {
    layout: 'classic',
    grade: 'sunset',
    caption: 'Sunset Heist',
    subtitle: '',
    captionPos: 'bottom',
    width: 1080,
    height: 1080,
    fillAll: true,
    selected: 0,
    slots: SLOT_DEFAULTS.map((d) => ({ img: null, ...d })),
  };
}

/** Pixel rects of the layout's panels on a w x h canvas, inside the white frame. */
export function panelRects(w, h, layout) {
  const frame = Math.max(8, Math.round(Math.min(w, h) * 0.018));
  const gutter = Math.max(6, Math.round(frame * 0.85));
  const iw = w - frame * 2;
  const ih = h - frame * 2;
  return LAYOUTS[layout].cells.map(([cx, cy, cw, ch]) => ({
    x: frame + cx * iw + gutter / 2,
    y: frame + cy * ih + gutter / 2,
    w: cw * iw - gutter,
    h: ch * ih - gutter,
  }));
}

const FILTERS = {
  sunset: 'saturate(1.35) contrast(1.07) brightness(1.03)',
  neon: 'saturate(1.5) contrast(1.2) brightness(0.92)',
  day: 'saturate(1.12) contrast(1.02) brightness(1.06)',
};

function panelOverlay(ctx, r, grade) {
  let g;
  if (grade === 'sunset') {
    g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, 'rgba(16, 4, 48, 0.14)');
    g.addColorStop(0.42, 'rgba(255, 130, 60, 0.05)');
    g.addColorStop(1, 'rgba(255, 45, 125, 0.34)');
  } else if (grade === 'neon') {
    g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    g.addColorStop(0, 'rgba(0, 229, 255, 0.20)');
    g.addColorStop(0.45, 'rgba(10, 0, 40, 0.10)');
    g.addColorStop(1, 'rgba(255, 43, 150, 0.32)');
  } else {
    g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
    g.addColorStop(1, 'rgba(255, 170, 80, 0.08)');
  }
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
}

function drawPanel(ctx, slot, img, r, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  if (img) {
    const scale = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight) * slot.zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = r.x - (dw - r.w) * ((slot.panX + 1) / 2);
    const dy = r.y - (dh - r.h) * ((slot.panY + 1) / 2);
    ctx.filter = FILTERS[grade];
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
  } else {
    // Empty panel: a graded placeholder so the collage still reads as a poster.
    const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    if (grade === 'neon') { g.addColorStop(0, '#1b0f38'); g.addColorStop(1, '#3d1154'); }
    else if (grade === 'day') { g.addColorStop(0, '#8fb6c9'); g.addColorStop(1, '#d9c9a8'); }
    else { g.addColorStop(0, '#4a1658'); g.addColorStop(1, '#b23a6d'); }
    ctx.fillStyle = g;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = `900 ${Math.round(Math.min(r.w, r.h) * 0.4)}px "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', r.x + r.w / 2, r.y + r.h / 2);
    ctx.textBaseline = 'alphabetic';
  }
  panelOverlay(ctx, r, grade);
  ctx.restore();
  ctx.strokeStyle = 'rgba(20, 8, 24, 0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
}

function coverGradePass(ctx, w, h, grade) {
  if (grade === 'sunset') {
    const glow = ctx.createRadialGradient(w * 0.8, h * 0.06, 0, w * 0.8, h * 0.06, Math.max(w, h) * 0.75);
    glow.addColorStop(0, 'rgba(255, 176, 80, 0.20)');
    glow.addColorStop(1, 'rgba(255, 176, 80, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(24, 4, 52, 0.16)');
    g.addColorStop(0.4, 'rgba(24, 4, 52, 0)');
    g.addColorStop(1, 'rgba(255, 45, 120, 0.18)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (grade === 'neon') {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'rgba(0, 229, 255, 0.10)');
    g.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    g.addColorStop(1, 'rgba(255, 43, 150, 0.14)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  // Vignette to pull the edges in, lighter for the clean grade.
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  v.addColorStop(0, 'rgba(12, 2, 24, 0)');
  v.addColorStop(1, `rgba(12, 2, 24, ${grade === 'day' ? 0.13 : 0.30})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

const CAPTION_FONT = (size) =>
  `900 ${size}px "Archivo Black", "Arial Black", "Arial Narrow Bold", Impact, Haettenschweiler, sans-serif`;
const CONDENSE = 0.84;

// Splits the caption into 1-3 lines that fit maxW at the given size, shrinking the size
// until they do. Returns { lines, size }.
function fitCaption(ctx, text, size, maxW) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return { lines: [], size };
  let s = size;
  for (let attempt = 0; attempt < 12; attempt++) {
    ctx.font = CAPTION_FONT(s);
    const width = (t) => ctx.measureText(t).width * CONDENSE;
    if (width(text) <= maxW) return { lines: [text], size: s };
    // Best two-line split: the one whose wider line is narrowest.
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const m = Math.max(width(a), width(b));
      if (!best || m < best.m) best = { lines: [a, b], m };
    }
    if (best && best.m <= maxW) return { lines: best.lines, size: s };
    // Greedy three lines.
    const lines = [];
    let line = '';
    for (const word of words) {
      if (line && width(`${line} ${word}`) > maxW) { lines.push(line); line = word; }
      else line = line ? `${line} ${word}` : word;
    }
    if (line) lines.push(line);
    if (lines.length <= 3 && lines.every((l) => width(l) <= maxW)) return { lines, size: s };
    s = Math.round(s * 0.9);
  }
  return { lines: [text], size: s };
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const PILL = {
  sunset: { bg: '#ff2e88', fg: '#ffffff' },
  neon: { bg: '#00e5ff', fg: '#07222e' },
  day: { bg: '#ff7847', fg: '#ffffff' },
};
const TEXT_GRADIENT = {
  sunset: ['#ffffff', '#ffe3ee', '#ffb347'],
  neon: ['#ffffff', '#e6fdff', '#9be9ff'],
  day: ['#ffffff', '#fff8e6', '#ffe1a8'],
};

function drawSubtitlePill(ctx, cx, cy, text, size, grade) {
  const fontSize = Math.round(size * 0.27);
  ctx.font = `700 ${fontSize}px "Arial Narrow Bold", "Helvetica Neue", Arial, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(fontSize * 0.18)}px`; } catch { /* older engines */ }
  const tw = ctx.measureText(text).width;
  const padX = fontSize * 0.9;
  const pw = tw + padX * 2;
  const ph = fontSize * 1.7;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.03);
  ctx.shadowColor = 'rgba(15, 0, 25, 0.45)';
  ctx.shadowBlur = fontSize * 0.35;
  ctx.shadowOffsetY = fontSize * 0.12;
  roundRectPath(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2);
  ctx.fillStyle = PILL[grade].bg;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = PILL[grade].fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, fontSize * 0.05);
  ctx.restore();
  try { ctx.letterSpacing = '0px'; } catch { /* older engines */ }
  ctx.textBaseline = 'alphabetic';
  return ph;
}

function drawCaption(ctx, w, h, state) {
  const main = state.caption.trim().toUpperCase();
  const sub = state.subtitle.trim().toUpperCase();
  if (!main && !sub) return;
  const startSize = Math.round(Math.min(h, w * 1.15) * 0.118);
  const { lines, size } = fitCaption(ctx, main, startSize, w * 0.9);
  const lineStep = size * 1.03;
  const blockH = lines.length * lineStep;
  const margin = h * 0.055;
  const atBottom = state.captionPos !== 'top';

  // Baselines of the caption lines.
  let firstBaseline;
  if (atBottom) firstBaseline = h - margin - blockH + size * 0.84;
  else firstBaseline = margin + size * 0.84;

  if (sub) {
    const pillCy = atBottom
      ? firstBaseline - size * 0.84 - size * 0.42
      : firstBaseline + blockH - size * 0.84 + size * 0.48;
    drawSubtitlePill(ctx, w / 2, pillCy, sub, size, state.grade);
  }
  if (!lines.length) return;

  const grad = ctx.createLinearGradient(0, firstBaseline - size, 0, firstBaseline + blockH);
  const stops = TEXT_GRADIENT[state.grade];
  grad.addColorStop(0, stops[0]);
  grad.addColorStop(0.55, stops[1]);
  grad.addColorStop(1, stops[2]);

  ctx.font = CAPTION_FONT(size);
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  lines.forEach((line, i) => {
    const y = firstBaseline + i * lineStep;
    ctx.save();
    ctx.translate(w / 2, y);
    ctx.transform(1, 0, -0.055, 1, 0, 0); // a slight poster italic
    ctx.scale(CONDENSE, 1);
    ctx.shadowColor = 'rgba(18, 0, 28, 0.55)';
    ctx.shadowBlur = size * 0.1;
    ctx.shadowOffsetY = size * 0.05;
    ctx.strokeStyle = '#180a16';
    ctx.lineWidth = size * 0.15;
    ctx.strokeText(line, 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = grad;
    ctx.fillText(line, 0, 0);
    ctx.restore();
  });
}

/** Draws the whole cover described by `state` onto the canvas at its current size. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.fillStyle = '#f7f2e7'; // the white poster frame / gutters
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(w, h, state.layout);
  rects.forEach((r, i) => {
    const slot = state.slots[i];
    const img = state.fillAll ? state.slots[0].img : slot.img;
    drawPanel(ctx, slot, img, r, state.grade);
  });
  coverGradePass(ctx, w, h, state);
  drawCaption(ctx, w, h, state);
}
