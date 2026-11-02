/**
 * Секти (sekti, яв. «волшебная сила») — внутренняя валюта KataCil.
 * Минималистичная звёздочка в стиле канчиля: мягкие скруглённые лучи,
 * ровный тёмный контур, тёплая заливка и румянец-блик.
 */
export function sektiSvg(opts: { ink?: string; fill?: string; shine?: string; dim?: boolean } = {}): string {
  const ink = opts.ink ?? "#3A2A1E";
  const fill = opts.dim ? "#E4DCD2" : opts.fill ?? "#F4C152";
  const shine = opts.shine ?? "#FFF3D1";
  // пятиконечная звезда со скруглёнными вершинами
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 10 : 4.9;
    pts.push(`${(12 + r * Math.cos(a)).toFixed(2)} ${(12.6 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M${pts.join(" L")} Z" fill="${fill}" stroke="${ink}" stroke-width="1.7" stroke-linejoin="round"/>
  ${opts.dim ? "" : `<path d="M8.6 9.4 Q9.6 8.2 11 8.3" stroke="${shine}" stroke-width="1.5" stroke-linecap="round" fill="none"/>`}
  <circle cx="10.3" cy="12.9" r="0.85" fill="${ink}"/><circle cx="13.7" cy="12.9" r="0.85" fill="${ink}"/>
  ${opts.dim ? "" : `<ellipse cx="9.4" cy="14.4" rx="1" ry="0.6" fill="#F4A3A0" opacity=".8"/><ellipse cx="14.6" cy="14.4" rx="1" ry="0.6" fill="#F4A3A0" opacity=".8"/>`}
</svg>`;
}
