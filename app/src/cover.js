// The cover renderer: a multi-panel poster collage in the authentic style of GTA cover art —
// comic-inked panels with bold gutters, Vice City sunset & neon colour grading,
// posterized pop-art comic filtering, official-style "VI" branding & rating badges,
// and heavy condensed typography with 3D drop-strokes.
// Works 100% offline using pure HTML5 Canvas API calls.

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
  day: { label: 'Golden Hour' },
  noir: { label: 'Vice Noir' },
};

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
    subtitle: 'Vice City',
    captionPos: 'bottom',
    comicEffect: true,
    showLogo: true,
    showBadge: true,
    width: 1080,
    height: 1080,
    fillAll: true,
    selected: 0,
    slots: SLOT_DEFAULTS.map((d) => ({ img: null, ...d })),
  };
}

export function panelRects(w, h, layout) {
  const frame = Math.max(10, Math.round(Math.min(w, h) * 0.022));
  const gutter = Math.max(8, Math.round(frame * 0.88));
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
  sunset: 'saturate(1.55) contrast(1.22) brightness(1.05)',
  neon: 'saturate(1.75) contrast(1.30) brightness(0.95) hue-rotate(-10deg)',
  day: 'saturate(1.30) contrast(1.15) brightness(1.08)',
  noir: 'saturate(0.15) contrast(1.45) brightness(0.92)',
};

function panelOverlay(ctx, r, grade, comicEffect) {
  let g;
  if (grade === 'sunset') {
    g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, 'rgba(40, 10, 70, 0.20)');
    g.addColorStop(0.40, 'rgba(255, 120, 40, 0.12)');
    g.addColorStop(0.75, 'rgba(255, 30, 110, 0.28)');
    g.addColorStop(1, 'rgba(255, 180, 50, 0.22)');
  } else if (grade === 'neon') {
    g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    g.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
    g.addColorStop(0.5, 'rgba(20, 5, 50, 0.15)');
    g.addColorStop(1, 'rgba(255, 20, 140, 0.35)');
  } else if (grade === 'noir') {
    g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, 'rgba(255, 50, 120, 0.18)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
  } else {
    g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    g.addColorStop(1, 'rgba(255, 160, 60, 0.16)');
  }
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);

  // Subtle comic halftone / scanline simulation
  if (comicEffect) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    const step = 4;
    for (let y = r.y; y < r.y + r.h; y += step * 2) {
      ctx.fillRect(r.x, y, r.w, step);
    }
    ctx.restore();
  }
}

function drawPanel(ctx, slot, img, r, grade, comicEffect) {
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

    ctx.filter = FILTERS[grade] || FILTERS.sunset;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';

    // Rockstar-style Comic Art Pass (Enhanced high-contrast ink simulation)
    if (comicEffect) {
      ctx.save();
      ctx.globalCompositeOperation = 'color-burn';
      ctx.fillStyle = 'rgba(25, 10, 35, 0.18)';
      ctx.fillRect(r.x, r.y, r.w, r.h);

      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = grade === 'neon' ? 'rgba(0, 220, 255, 0.25)' : 'rgba(255, 140, 40, 0.25)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.restore();
    }
  } else {
    // Empty panel: stylish Miami sunset placeholder
    const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    if (grade === 'neon') {
      g.addColorStop(0, '#16092e'); g.addColorStop(1, '#4d1066');
    } else if (grade === 'noir') {
      g.addColorStop(0, '#111118'); g.addColorStop(1, '#333340');
    } else {
      g.addColorStop(0, '#3e104f'); g.addColorStop(0.5, '#992262'); g.addColorStop(1, '#ff6a3d');
    }
    ctx.fillStyle = g;
    ctx.fillRect(r.x, r.y, r.w, r.h);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = `900 ${Math.round(Math.min(r.w, r.h) * 0.38)}px "Impact", "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', r.x + r.w / 2, r.y + r.h / 2);
  }

  panelOverlay(ctx, r, grade, comicEffect);
  ctx.restore();

  // Heavy comic book black ink inner border
  ctx.save();
  ctx.strokeStyle = '#0e0614';
  ctx.lineWidth = Math.max(3, Math.round(Math.min(r.w, r.h) * 0.012));
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

function coverGradePass(ctx, w, h, grade) {
  if (grade === 'sunset') {
    // Warm top-corner sunshine & neon magenta wash
    const glow = ctx.createRadialGradient(w * 0.85, h * 0.08, 0, w * 0.85, h * 0.08, Math.max(w, h) * 0.85);
    glow.addColorStop(0, 'rgba(255, 195, 70, 0.26)');
    glow.addColorStop(0.45, 'rgba(255, 70, 130, 0.12)');
    glow.addColorStop(1, 'rgba(255, 50, 120, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(30, 6, 60, 0.16)');
    g.addColorStop(0.5, 'rgba(255, 100, 40, 0.04)');
    g.addColorStop(1, 'rgba(255, 30, 110, 0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (grade === 'neon') {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'rgba(0, 240, 255, 0.16)');
    g.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    g.addColorStop(1, 'rgba(255, 30, 160, 0.20)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // Dramatic cinematic edge vignette
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.40, w / 2, h / 2, Math.max(w, h) * 0.82);
  v.addColorStop(0, 'rgba(10, 2, 20, 0)');
  v.addColorStop(1, 'rgba(8, 2, 16, 0.42)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

// -----------------------------------------------------------------------------
// GTA VI Official-Style Roman Numeral "VI" Logo & Badges
// -----------------------------------------------------------------------------

function drawGTALogo(ctx, w, h, state) {
  if (state.showLogo === false) return;
  const isTop = state.captionPos === 'top';
  // If caption is top, place logo at top-left or bottom-right
  const scale = Math.min(w, h) * 0.0011;
  const logoW = 120 * scale;
  const logoH = 95 * scale;
  const margin = 26 * scale;

  const lx = isTop ? w - logoW - margin : margin + 8 * scale;
  const ly = isTop ? h - logoH - margin : margin + 6 * scale;

  ctx.save();
  ctx.translate(lx, ly);

  // Background drop glow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 16 * scale;
  ctx.shadowOffsetY = 6 * scale;

  // Draw Grand Theft Auto mini pill header
  const pillW = 140 * scale;
  const pillH = 22 * scale;
  ctx.fillStyle = '#0a0312';
  ctx.fillRect(-6 * scale, -4 * scale, pillW, pillH);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.8 * scale;
  ctx.strokeRect(-6 * scale, -4 * scale, pillW, pillH);

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#fceef8';
  ctx.font = `900 ${Math.round(11 * scale)}px "Impact", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('GRAND THEFT AUTO', pillW / 2 - 6 * scale, 12 * scale);

  // Iconic "VI" Roman Numerals with Miami Neon Sunset Gradient
  const viY = 24 * scale;
  const viGrad = ctx.createLinearGradient(0, viY, 0, viY + 70 * scale);
  viGrad.addColorStop(0, '#ffffff');
  viGrad.addColorStop(0.25, '#ffe5f2');
  viGrad.addColorStop(0.55, '#ff358b');
  viGrad.addColorStop(0.85, '#ff8a3d');
  viGrad.addColorStop(1, '#ffc83b');

  // "VI" 3D Background Shadow
  ctx.font = `900 ${Math.round(72 * scale)}px "Arial Black", "Impact", sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#100418';
  ctx.fillText('VI', 2 * scale, viY + 64 * scale);

  // "VI" Thick Black Stroke
  ctx.strokeStyle = '#0c0214';
  ctx.lineWidth = 10 * scale;
  ctx.lineJoin = 'miter';
  ctx.strokeText('VI', 0, viY + 60 * scale);

  // "VI" Main Vibrant Fill
  ctx.fillStyle = viGrad;
  ctx.fillText('VI', 0, viY + 60 * scale);

  // Subtle interior shine line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 2 * scale;
  ctx.strokeText('VI', -1 * scale, viY + 59 * scale);

  ctx.restore();
}

function drawParentalBadge(ctx, w, h, state) {
  if (state.showBadge === false) return;
  const isTop = state.captionPos === 'top';
  const scale = Math.min(w, h) * 0.001;
  const bw = 84 * scale;
  const bh = 105 * scale;
  const margin = 26 * scale;

  const bx = isTop ? margin + 6 * scale : w - bw - margin;
  const by = isTop ? h - bh - margin : margin + 8 * scale;

  ctx.save();
  ctx.translate(bx, by);

  // Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 12 * scale;
  ctx.shadowOffsetY = 4 * scale;

  // Rating Box (ESRB/PEGI M style)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, bw, bh);
  ctx.strokeStyle = '#100416';
  ctx.lineWidth = 3.5 * scale;
  ctx.strokeRect(0, 0, bw, bh);

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#100416';
  ctx.fillRect(0, 0, bw, bh * 0.62);

  // Letter "M" or "18"
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.round(44 * scale)}px "Impact", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('M', bw / 2, bh * 0.48);

  // Subtext: MATURE 17+
  ctx.fillStyle = '#100416';
  ctx.font = `800 ${Math.round(9 * scale)}px "Arial Black", sans-serif`;
  ctx.fillText('MATURE 17+', bw / 2, bh * 0.77);
  ctx.font = `700 ${Math.round(7.5 * scale)}px "Arial", sans-serif`;
  ctx.fillText('VICE CITY', bw / 2, bh * 0.90);

  ctx.restore();
}

// -----------------------------------------------------------------------------
// Typography & Caption Engine
// -----------------------------------------------------------------------------

const CAPTION_FONT = (size) =>
  `900 ${size}px "Impact", "Arial Black", "Arial Narrow Bold", Haettenschweiler, sans-serif`;
const CONDENSE = 0.86;

function fitCaption(ctx, text, size, maxW) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return { lines: [], size };
  let s = size;
  for (let attempt = 0; attempt < 14; attempt++) {
    ctx.font = CAPTION_FONT(s);
    const width = (t) => ctx.measureText(t).width * CONDENSE;
    if (width(text) <= maxW) return { lines: [text], size: s };

    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const m = Math.max(width(a), width(b));
      if (!best || m < best.m) best = { lines: [a, b], m };
    }
    if (best && best.m <= maxW) return { lines: best.lines, size: s };

    const lines = [];
    let line = '';
    for (const word of words) {
      if (line && width(`${line} ${word}`) > maxW) { lines.push(line); line = word; }
      else line = line ? `${line} ${word}` : word;
    }
    if (line) lines.push(line);
    if (lines.length <= 3 && lines.every((l) => width(l) <= maxW)) return { lines, size: s };
    s = Math.round(s * 0.88);
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
  sunset: { bg: 'linear-gradient(#ff1f84, #ff6b3b)', fg: '#ffffff', stroke: '#fff' },
  neon: { bg: 'linear-gradient(#00f0ff, #c81eff)', fg: '#061724', stroke: '#00f0ff' },
  day: { bg: 'linear-gradient(#ff6e30, #ffba3b)', fg: '#ffffff', stroke: '#fff' },
  noir: { bg: 'linear-gradient(#2b2b36, #121218)', fg: '#ff2e88', stroke: '#ff2e88' },
};

const TEXT_GRADIENT = {
  sunset: ['#ffffff', '#ffebf5', '#ff3891', '#ff9f3b'],
  neon: ['#ffffff', '#e6ffff', '#00f0ff', '#ff2299'],
  day: ['#ffffff', '#fff8e8', '#ffb53b', '#ff6b2b'],
  noir: ['#ffffff', '#d5d5e2', '#7a7a92', '#3a3a4c'],
};

function drawSubtitlePill(ctx, cx, cy, text, size, grade) {
  const fontSize = Math.round(size * 0.28);
  ctx.font = `800 ${fontSize}px "Arial Black", "Arial Narrow Bold", sans-serif`;
  try { ctx.letterSpacing = `${Math.round(fontSize * 0.16)}px`; } catch { /* older */ }
  const tw = ctx.measureText(text).width;
  const padX = fontSize * 1.1;
  const pw = tw + padX * 2;
  const ph = fontSize * 1.75;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.035);

  // 3D Drop Shadow
  ctx.shadowColor = 'rgba(8, 0, 16, 0.70)';
  ctx.shadowBlur = fontSize * 0.45;
  ctx.shadowOffsetY = fontSize * 0.18;

  roundRectPath(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2);

  // Gradient fill for pill
  const pGrad = ctx.createLinearGradient(-pw / 2, -ph / 2, pw / 2, ph / 2);
  if (grade === 'neon') {
    pGrad.addColorStop(0, '#00f0ff');
    pGrad.addColorStop(1, '#ff1a8c');
  } else if (grade === 'noir') {
    pGrad.addColorStop(0, '#2e1c38');
    pGrad.addColorStop(1, '#110a18');
  } else {
    pGrad.addColorStop(0, '#ff1a8c');
    pGrad.addColorStop(1, '#ff7a2b');
  }
  ctx.fillStyle = pGrad;
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, fontSize * 0.08);
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = grade === 'neon' ? '#071824' : '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, fontSize * 0.05);

  ctx.restore();
  try { ctx.letterSpacing = '0px'; } catch { /* older */ }
  ctx.textBaseline = 'alphabetic';
  return ph;
}

function drawCaption(ctx, w, h, state) {
  const main = state.caption.trim().toUpperCase();
  const sub = state.subtitle.trim().toUpperCase();
  if (!main && !sub) return;

  const startSize = Math.round(Math.min(h, w * 1.15) * 0.126);
  const { lines, size } = fitCaption(ctx, main, startSize, w * 0.92);
  const lineStep = size * 1.05;
  const blockH = lines.length * lineStep;
  const margin = h * 0.052;
  const atBottom = state.captionPos !== 'top';

  let firstBaseline;
  if (atBottom) firstBaseline = h - margin - blockH + size * 0.84;
  else firstBaseline = margin + size * 0.84;

  if (sub) {
    const pillCy = atBottom
      ? firstBaseline - size * 0.84 - size * 0.44
      : firstBaseline + blockH - size * 0.84 + size * 0.50;
    drawSubtitlePill(ctx, w / 2, pillCy, sub, size, state.grade);
  }
  if (!lines.length) return;

  const grad = ctx.createLinearGradient(0, firstBaseline - size, 0, firstBaseline + blockH);
  const stops = TEXT_GRADIENT[state.grade] || TEXT_GRADIENT.sunset;
  grad.addColorStop(0, stops[0]);
  grad.addColorStop(0.35, stops[1]);
  grad.addColorStop(0.72, stops[2]);
  grad.addColorStop(1, stops[3] || stops[2]);

  ctx.font = CAPTION_FONT(size);
  ctx.textAlign = 'center';
  ctx.lineJoin = 'miter';

  lines.forEach((line, i) => {
    const y = firstBaseline + i * lineStep;
    ctx.save();
    ctx.translate(w / 2, y);
    ctx.transform(1, 0, -0.065, 1, 0, 0); // GTA italic tilt
    ctx.scale(CONDENSE, 1);

    // Deep 3D Drop Extrusion Shadow
    ctx.fillStyle = '#0a020f';
    const depth = Math.round(size * 0.075);
    for (let d = depth; d > 0; d--) {
      ctx.fillText(line, d * 1.2, d * 1.5);
    }

    // Heavy Black Outer Stroke
    ctx.strokeStyle = '#0e0414';
    ctx.lineWidth = size * 0.18;
    ctx.strokeText(line, 0, 0);

    // Secondary Neon Glow Outline
    if (state.grade === 'neon' || state.grade === 'sunset') {
      ctx.strokeStyle = state.grade === 'neon' ? 'rgba(0, 240, 255, 0.45)' : 'rgba(255, 40, 130, 0.45)';
      ctx.lineWidth = size * 0.08;
      ctx.strokeText(line, 0, 0);
    }

    // Main Vibrant Gradient Fill
    ctx.fillStyle = grad;
    ctx.fillText(line, 0, 0);

    // Top Highlight Hairline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = size * 0.02;
    ctx.strokeText(line, 0, -size * 0.02);

    ctx.restore();
  });
}

/** Draws the whole cover described by `state` onto the canvas at its current size. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;

  // The crisp white poster frame and gutters
  ctx.fillStyle = '#f8f4ec';
  ctx.fillRect(0, 0, w, h);

  // Outer bold frame boundary
  ctx.strokeStyle = '#0d0414';
  ctx.lineWidth = Math.max(4, Math.round(Math.min(w, h) * 0.008));
  ctx.strokeRect(0, 0, w, h);

  const rects = panelRects(w, h, state.layout);
  rects.forEach((r, i) => {
    const slot = state.slots[i];
    const img = state.fillAll ? state.slots[0].img : slot.img;
    drawPanel(ctx, slot, img, r, state.grade, state.comicEffect !== false);
  });

  coverGradePass(ctx, w, h, state.grade);
  drawGTALogo(ctx, w, h, state);
  drawParentalBadge(ctx, w, h, state);
  drawCaption(ctx, w, h, state);
}
