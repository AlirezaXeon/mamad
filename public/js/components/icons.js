// آیکون‌های خطی ساده برای کارت خدمات
const P = {
  interior: 'M4 11V8a2 2 0 012-2h12a2 2 0 012 2v3M3 11h18v5H3zM6 16v3M18 16v3',
  facade: 'M5 21V5l7-2 7 2v16M3 21h18M9 9h2M13 9h2M9 13h2M13 13h2M10 21v-4h4v4',
  renovation: 'M14.7 6.3a4 4 0 00-5.4 5.1L3 17.7 6.3 21l6.3-6.3a4 4 0 005.1-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
  render: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  landscape: 'M12 21v-7M7 14h10l-5-9zM9 10h6',
  supervision: 'M9 4h6v3H9zM7 5H6a1 1 0 00-1 1v14a1 1 0 001 1h12a1 1 0 001-1V6a1 1 0 00-1-1h-1M9 14l2 2 4-4',
  phase1: 'M3 4h18v16H3zM9 4v16M3 10h6M9 15h12',
  phase2: 'M3 21h18L3 3v18zM7 17h6L7 11v6zM3 7h2M3 11h2M3 15h2',
  kitchen: 'M3 4h18v16H3V4zm0 6h18M12 10v10M7 7h2M15 7h2M9 14v3M15 14v3',
  villa: 'M3 10.5L12 3l9 7.5V21H3V10.5zM9 21v-7h6v7M6 10h2v2H6zM16 10h2v2h-2z',
  asbuilt: 'M3 21h18M5 21V7l8-4 6 3v15M9 10h2M9 14h2M9 18h2M14 10h2M14 14h2M14 18h2M2 7l11-4 9 4.5',
};
export const svg = markup => { const t = document.createElement('template'); t.innerHTML = markup.trim(); return t.content.firstChild; };
export const icon = id => svg(`<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[id] || P.interior}"/></svg>`);
