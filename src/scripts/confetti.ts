// Confeti con los colores de la marca (sin librerías). Dura ~2 s y se borra solo.
// Con "reducir movimiento" activado no se muestra.
const COLORS = ['#FBCFAF', '#E8A6B4', '#D1C1DD', '#B4A3D6', '#8F7FB0', '#655785', '#F0BC95'];

export function confetti(from?: DOMRect) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:100';
  document.body.append(canvas);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth, H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  // sale desde el centro de la barra (o de la parte alta de la pantalla)
  const x0 = from ? from.left + from.width / 2 : W / 2;
  const y0 = from ? from.top + from.height / 2 : H * 0.3;
  const parts = Array.from({ length: 140 }, () => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const v = 7 + Math.random() * 9;
    return {
      x: x0 + (Math.random() - 0.5) * (from ? from.width * 0.6 : 80), y: y0,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      c: COLORS[(Math.random() * COLORS.length) | 0],
      round: Math.random() < 0.3
    };
  });

  const start = performance.now();
  const tick = (t: number) => {
    const k = (t - start) / 2200;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.32; p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, k - 0.6) / 0.4);
      ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 2);
      ctx.restore();
    }
    if (k < 1) requestAnimationFrame(tick); else canvas.remove();
  };
  requestAnimationFrame(tick);
}
