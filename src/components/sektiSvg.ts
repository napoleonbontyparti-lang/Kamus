/**
 * Секти (sekti, яв. «волшебная сила») — внутренняя валюта KataCil.
 * Значок — три искорки: большая четырёхлучевая звезда с вогнутыми гранями и две маленькие,
 * ровная линия в стиле канчиля, тёплая заливка (серая — у ещё не полученных наград).
 */
function sparkle(cx: number, cy: number, r: number): string {
  const k = r * 0.46; // насколько вогнуты грани
  return `M${cx} ${cy - r} C${cx} ${cy - k} ${cx + k} ${cy} ${cx + r} ${cy} C${cx + k} ${cy} ${cx} ${cy + k} ${cx} ${cy + r} `
    + `C${cx} ${cy + k} ${cx - k} ${cy} ${cx - r} ${cy} C${cx - k} ${cy} ${cx} ${cy - k} ${cx} ${cy - r} Z`;
}

export function sektiSvg(opts: { ink?: string; fill?: string; dim?: boolean } = {}): string {
  const ink = opts.ink ?? "#3A2A1E";
  const fill = opts.dim ? "#E4DCD2" : opts.fill ?? "#F4C152";
  const s = `fill="${fill}" stroke="${ink}" stroke-width="1.3" stroke-linejoin="round"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="${sparkle(14.6, 13.6, 8.6)}" ${s}/>
  <path d="${sparkle(6.4, 6.2, 3.9)}" ${s}/>
  <path d="${sparkle(7.4, 18.6, 3.4)}" ${s}/>
</svg>`;
}
