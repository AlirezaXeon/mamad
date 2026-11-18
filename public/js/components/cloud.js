// ابر واقعی برای حباب‌های هیرو: دور یک کپسول، برآمدگی‌های نیم‌دایره‌ای با اندازه‌های متفاوت.
// مسیر بر اساس اندازه واقعی حباب (و نه کشیدن یک شکل ثابت) ساخته می‌شود، پس برآمدگی‌ها هرگز کج و کشیده نمی‌شوند.
export function cloudPath(W, H, seed = 0) {
  const b = Math.min(9, H * 0.2);                 // ارتفاع تقریبی برآمدگی‌ها
  const x0 = b, y0 = b, w = W - 2 * b, h = H - 2 * b;
  const R = h / 2, s = Math.max(0, w - 2 * R);    // شعاع دو سر و طول بخش صاف
  const P = 2 * s + 2 * Math.PI * R;              // محیط کپسول

  // نقطه روی محیط، در جهت ساعت‌گرد، از ابتدای ضلع بالایی
  const at = t => {
    t = ((t % P) + P) % P;
    if (t < s) return [x0 + R + t, y0];
    t -= s;
    if (t < Math.PI * R) { const a = t / R; return [x0 + w - R + R * Math.sin(a), y0 + R - R * Math.cos(a)]; }
    t -= Math.PI * R;
    if (t < s) return [x0 + w - R - t, y0 + h];
    t -= s;
    const a = t / R;
    return [x0 + R - R * Math.sin(a), y0 + R + R * Math.cos(a)];
  };

  const n = Math.max(6, Math.round(P / (b * 3.2)));
  const wts = Array.from({ length: n }, (_, i) => 1 + 0.22 * Math.sin((i + seed) * 2.4) + 0.08 * Math.cos(i * 5.1 + seed));
  const sum = wts.reduce((a, c) => a + c, 0);

  let acc = 0;
  const pts = wts.map(wt => { const p = at((acc / sum) * P); acc += wt; return p; });

  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i <= n; i++) {
    const [px, py] = pts[i - 1], [qx, qy] = pts[i % n];
    const r = Math.hypot(qx - px, qy - py) * 0.56;
    d += `A${r.toFixed(1)},${r.toFixed(1)} 0 0 1 ${qx.toFixed(1)},${qy.toFixed(1)}`;
  }
  return d + 'Z';
}

// مسیر را با هر تغییر اندازه (و بعد از بارگذاری فونت) دوباره می‌سازد
export function attachCloud(cloud, svg, path, seed = 0) {
  const draw = () => {
    const W = cloud.offsetWidth, H = cloud.offsetHeight;
    if (!W || !H) return;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    path.setAttribute('d', cloudPath(W, H, seed));
  };
  if ('ResizeObserver' in window) new ResizeObserver(draw).observe(cloud);
  else requestAnimationFrame(draw);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
}
