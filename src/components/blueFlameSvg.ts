/** Синий огонёк (SVG-строка) — без зависимостей, используется и в виджете. */
export const blueFlameSvg = (lit = true) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs>
    <linearGradient id="g" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="${lit ? "#1E5BD8" : "#9AA3AF"}"/>
      <stop offset="1" stop-color="${lit ? "#5EC8FF" : "#C9CED6"}"/>
    </linearGradient>
  </defs>
  <path d="M12 2.2c.6 3.1 2.6 4.6 4.3 6.6 1.6 1.9 2.7 3.9 2.7 6.3 0 4-3.1 6.9-7 6.9s-7-2.9-7-6.9c0-2.6 1.3-4.6 2.9-6.1.2 1.6.9 2.8 2.1 3.4-.4-3.8.6-7.4 2-10.2z" fill="url(#g)"/>
  <path d="M12 12.4c.4 1.5 1.5 2.2 2.2 3.2.6.8.9 1.6.9 2.5 0 1.8-1.4 3.1-3.1 3.1s-3.1-1.3-3.1-3.1c0-1.3.7-2.4 1.6-3.2.1.7.5 1.2 1 1.4-.1-1.4 0-2.8.5-3.9z" fill="${lit ? "#E8F6FF" : "#F1F3F5"}"/>
</svg>`;

