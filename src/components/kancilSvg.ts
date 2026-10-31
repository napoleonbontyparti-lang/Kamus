/**
 * Si Kancil — маскот приложения в минималистичном линейном стиле.
 * Оригинальный рисунок: малый канчиль (Tragulus) — без рогов, на тонких ножках,
 * с белыми полосками на горле. Контур строится как объединение фигур:
 * сначала все фигуры обводятся толстой линией, потом заливаются цветом фона —
 * остаётся один непрерывный контур без внутренних швов.
 */
export type Mood = "hello" | "read" | "think" | "sleep" | "yay" | "sad" | "happy";

export type KancilColors = { ink: string; fill: string; accent: string; blush: string };

export const DEFAULT_COLORS: KancilColors = { ink: "#3A2A1E", fill: "#FFFFFF", accent: "#2E7D74", blush: "#F4B3A8" };

const W = 4.2; // толщина контура

type Part = { d: string; line?: number }; // line — толщина «палочки» (ноги, хвост)

const shift = (d: string, dx: number, dy: number) =>
  d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${+x + dx} ${+y + dy}`);

const HEAD = `M44 84 C46 78 54 74 60 66 C68 54 82 50 94 54 C106 58 110 72 104 84 C98 96 84 98 72 96 C60 94 50 92 44 84 Z`;
const EAR_FRONT = `M90 58 C96 42 108 34 122 36 C122 48 114 60 100 66 Z`;
const EAR_BACK = `M78 56 C74 42 78 30 84 24 C92 32 94 46 90 58 Z`;

function parts(mood: Mood): Part[] {
  const tailUp = mood === "yay" || mood === "happy" || mood === "hello";
  if (mood === "sleep") {
    const dy = 22;
    return [
      { d: `M150 156 L172 156`, line: 6 }, // поджатые ножки
      { d: `M100 158 L122 158`, line: 6 },
      { d: `M168 136 C176 132 180 126 178 120`, line: 6 },
      { d: `M84 148 C82 128 104 118 130 118 C158 118 172 130 170 146 C168 156 156 158 130 158 C104 158 86 158 84 148 Z` },
      { d: `M80 106 C86 116 94 122 108 122 L110 140 C92 142 80 132 74 116 Z` },
      { d: shift(EAR_BACK, 0, dy) }, { d: shift(EAR_FRONT, 0, dy) },
      { d: shift(HEAD, 0, dy) },
    ];
  }
  return [
    // тонкие ножки — главная примета канчиля
    { d: `M101 130 L97 168`, line: 6 },
    { d: `M114 132 L114 170`, line: 6 },
    { d: `M147 130 L143 168`, line: 6 },
    { d: `M158 126 L160 170`, line: 6 },
    { d: tailUp ? `M164 108 C170 104 174 98 174 92` : `M166 114 C172 118 174 124 172 130`, line: 6 },
    { d: `M92 118 C92 102 108 96 128 96 C150 96 168 102 168 118 C168 132 156 140 130 140 C106 140 92 134 92 118 Z` },
    { d: `M80 86 C86 96 92 102 104 104 L108 126 C92 128 80 118 72 98 Z` },
    { d: EAR_BACK }, { d: EAR_FRONT },
    { d: HEAD },
  ];
}

function face(mood: Mood, c: KancilColors, dy: number): string {
  const sw = (w: number) => `stroke="${c.ink}" stroke-width="${w}" stroke-linecap="round" fill="none"`;
  const s = sw(W);
  const e = { x: 76, y: 74 + dy };
  let eyes: string;
  switch (mood) {
    case "sleep":
    case "hello":
      eyes = `<path d="M${e.x - 7} ${e.y + 1} L${e.x + 6} ${e.y + 1}" ${s}/>`;
      break;
    case "yay":
    case "happy":
      eyes = `<path d="M${e.x - 7} ${e.y + 3} Q${e.x} ${e.y - 6} ${e.x + 7} ${e.y + 3}" ${s}/>`;
      break;
    case "sad":
      eyes = `<path d="M${e.x - 7} ${e.y - 1} Q${e.x} ${e.y + 6} ${e.x + 7} ${e.y - 1}" ${s}/>
        <path d="M${e.x - 6} ${e.y - 10} L${e.x + 5} ${e.y - 13}" ${sw(3)}/>`;
      break;
    case "think":
      eyes = `<circle cx="${e.x + 1}" cy="${e.y - 1}" r="4.2" fill="${c.ink}"/>`;
      break;
    default: // read — смотрит вниз, в книгу
      eyes = `<path d="M${e.x - 7} ${e.y + 2} Q${e.x} ${e.y + 7} ${e.x + 7} ${e.y + 2}" ${s}/>`;
  }
  const nose = `<circle cx="48" cy="${83 + dy}" r="3.6" fill="${c.ink}"/>`;
  const blush = mood === "yay" || mood === "happy" || mood === "hello" || mood === "read"
    ? `<ellipse cx="88" cy="${85 + dy}" rx="6" ry="3.4" fill="${c.blush}"/>` : "";
  const mouth = mood === "yay"
    ? `<path d="M56 ${90 + dy} Q61 ${96 + dy} 66 ${91 + dy}" ${sw(3.2)}/>`
    : mood === "think" ? `<circle cx="60" cy="${92 + dy}" r="2.2" fill="${c.ink}"/>` : "";
  const ear = `<path d="${shift("M101 57 C104 50 109 45 115 43", 0, dy)}" ${sw(3.2)}/>`;
  return nose + blush + eyes + mouth + ear;
}

function stripes(c: KancilColors, lying: boolean): string {
  // полоски на горле — короткие штрихи
  const s = `stroke="${c.ink}" stroke-width="3.2" stroke-linecap="round" fill="none"`;
  return lying
    ? `<path d="M88 126 q5 -4 11 -2" ${s}/><path d="M93 135 q5 -4 11 -2" ${s}/>`
    : `<path d="M86 104 q5 -4 11 -2" ${s}/><path d="M92 114 q5 -4 11 -2" ${s}/>`;
}

function extras(mood: Mood, c: KancilColors): string {
  const s = `stroke="${c.ink}" stroke-width="${W}" stroke-linecap="round" stroke-linejoin="round"`;
  const font = `font-family="Nunito, Arial Rounded MT Bold, sans-serif" font-weight="900" fill="${c.accent}"`;
  switch (mood) {
    case "read":
      return `<g transform="translate(66 136) rotate(-6)">
        <path d="M-30 -4 Q-14 -10 0 -2 Q14 -10 30 -4 L30 22 Q14 16 0 24 Q-14 16 -30 22 Z" fill="${c.fill}" ${s}/>
        <path d="M0 -2 L0 24" ${s}/>
        <path d="M-22 5 h12 M-22 12 h10 M10 5 h12 M10 12 h10" stroke="${c.accent}" stroke-width="3" stroke-linecap="round"/>
      </g>`;
    case "think":
      return `<text x="146" y="62" font-size="42" text-anchor="middle" ${font}>?</text>`;
    case "sleep":
      return `<g ${font}><text x="122" y="80" font-size="18">z</text><text x="138" y="62" font-size="24">z</text><text x="158" y="42" font-size="30">z</text></g>`;
    case "yay": {
      const star = (x: number, y: number, r: number) =>
        `<path d="M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} Z" fill="${c.accent}"/>`;
      return star(150, 44, 10) + star(30, 42, 7) + star(178, 74, 6) +
        `<circle cx="136" cy="20" r="3" fill="${c.blush}"/><circle cx="22" cy="72" r="3" fill="${c.blush}"/>`;
    }
    case "sad":
      return `<path d="M90 81 q-4 7 0 9 q4 -2 0 -9 z" fill="${c.accent}"/>`;
    default:
      return "";
  }
}

/** Рисунок 200×200. Цвета подстраиваются под тему (тёмная — светлые линии). */
export function kancilSvg(mood: Mood = "hello", colors: Partial<KancilColors> = {}): string {
  const c = { ...DEFAULT_COLORS, ...colors };
  const ps = parts(mood);
  const lying = mood === "sleep";
  const tilt = mood === "think" ? -5 : mood === "sad" ? 4 : 0;
  const outline = ps.map((p) => p.line
    ? `<path d="${p.d}" stroke="${c.ink}" stroke-width="${p.line + 2 * W}" stroke-linecap="round" fill="none"/>`
    : `<path d="${p.d}" fill="${c.ink}" stroke="${c.ink}" stroke-width="${2 * W}" stroke-linejoin="round"/>`).join("");
  const fill = ps.map((p) => p.line
    ? `<path d="${p.d}" stroke="${c.fill}" stroke-width="${p.line}" stroke-linecap="round" fill="none"/>`
    : `<path d="${p.d}" fill="${c.fill}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <g transform="rotate(${tilt} 104 110)">
    ${outline}${fill}
    ${stripes(c, lying)}
    ${face(mood, c, lying ? 22 : 0)}
  </g>
  ${extras(mood, c)}
</svg>`;
}
