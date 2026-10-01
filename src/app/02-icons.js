/* ---------- Iconografía: Lucide (https://lucide.dev, licencia ISC), embebida en el build ---------- */
const ICONS = D.icons;
const icon = (name, size = 18, cls = '') => `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
/* Marca: roseta de ocho pétalos con el degradado del acento */
const rosette = (s = 34) => `<svg class="rosette" width="${s}" height="${s}" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--fw-nis2)"/></linearGradient></defs>
  <circle cx="20" cy="20" r="19" fill="url(#rg)" opacity=".18"/>${[0, 45, 90, 135].map((a) => `<ellipse cx="20" cy="20" rx="6" ry="16" fill="none" stroke="url(#rg)" stroke-width="1.6" transform="rotate(${a} 20 20)"/>`).join('')}<circle cx="20" cy="20" r="3.4" fill="url(#rg)"/></svg>`;

