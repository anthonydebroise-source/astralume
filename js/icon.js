// Icône de l'application, dessinée en code (utilisée par tools/make-icons.mjs)
export function drawAppIcon(g, S, maskable = false) {
  const c = S / 2;
  let gr = g.createRadialGradient(c, c * 0.8, 0, c, c, S * 0.75);
  gr.addColorStop(0, '#3a1a8a'); gr.addColorStop(0.55, '#160a3e'); gr.addColorStop(1, '#05030f');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = 'lighter';
  const blob = (x, y, r, col, a) => { const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, col.replace('A', a)); q.addColorStop(1, col.replace('A', 0)); g.fillStyle = q; g.fillRect(0, 0, S, S); };
  blob(S * 0.3, S * 0.3, S * 0.5, 'rgba(255,63,169,A)', 0.45);
  blob(S * 0.75, S * 0.7, S * 0.5, 'rgba(56,242,255,A)', 0.35);
  for (let i = 0; i < 40; i++) { const x = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * S, y = (Math.sin(i * 78.233) * 12345.678 % 1 + 1) % 1 * S; g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(x, y, S * 0.004 * (1 + (i % 3)), 0, Math.PI * 2); g.fill(); }
  // constellation
  const pts = [[0.22, 0.3], [0.38, 0.2], [0.55, 0.28], [0.72, 0.18], [0.8, 0.36]];
  g.strokeStyle = 'rgba(191,232,255,0.7)'; g.lineWidth = S * 0.008;
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * S, y * S) : g.moveTo(x * S, y * S))); g.stroke();
  for (const [x, y] of pts) blob(x * S, y * S, S * 0.05, 'rgba(220,245,255,A)', 1);
  // vaisseau
  g.save();
  const k = maskable ? 0.82 : 1;
  g.translate(c, S * 0.6); g.scale(S / 70 * k, S / 70 * k);
  blob(0, 0, 0, 'rgba(0,0,0,A)', 0);
  g.globalCompositeOperation = 'lighter';
  const q = g.createRadialGradient(0, 4, 0, 0, 4, 26); q.addColorStop(0, 'rgba(56,242,255,0.7)'); q.addColorStop(1, 'rgba(56,242,255,0)');
  g.fillStyle = q; g.beginPath(); g.arc(0, 4, 26, 0, Math.PI * 2); g.fill();
  g.globalCompositeOperation = 'source-over';
  g.beginPath(); g.moveTo(0, -22); g.lineTo(6, -6); g.lineTo(18, 8); g.lineTo(17, 13); g.lineTo(6, 9); g.lineTo(0, 14); g.lineTo(-6, 9); g.lineTo(-17, 13); g.lineTo(-18, 8); g.lineTo(-6, -6); g.closePath();
  const hg = g.createLinearGradient(-18, 0, 18, 0); hg.addColorStop(0, '#062a36'); hg.addColorStop(0.5, '#1590a8'); hg.addColorStop(1, '#062a36');
  g.fillStyle = hg; g.fill(); g.strokeStyle = '#7ff8ff'; g.lineWidth = 1.6; g.stroke();
  g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, -5, 3.2, 6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(-3, 14); g.lineTo(0, 24); g.lineTo(3, 14); g.fill();
  g.restore();
}
