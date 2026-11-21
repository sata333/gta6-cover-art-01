// Fixed scenes for screenshots: ?shot=cover renders just the cover at the requested export
// size, full-viewport with no UI; ?shot=editor shows the editor with a sample loaded.
// Recognised params: photo (samples/<photo>.jpg), caption, subtitle, layout, grade,
// size (e.g. 1920x1080) and pos (top|bottom). main.js applies them via the callback, then
// window.__shotReady is set once the scene has painted.
export async function runShot(shot, query, apply) {
  await apply(shot, query);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
