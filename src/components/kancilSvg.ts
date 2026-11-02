/**
 * Si Kancil — маскот приложения в минималистичном линейном стиле.
 * Оригинальный рисунок: малый канчиль (Tragulus) — без рогов, на тонких ножках. Контур строится как объединение фигур:
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

// Пропорции по образцу: крупная голова, большое переднее ухо, S-образная шея,
// короткое туловище, тонкие сужающиеся ножки, хвостик торчком.
const HEAD = `M35 75 C38 74 41 72 44 67 C50 56 60 47 72 46 C85 45 97 51 98 61 C99 71 93 80 86 86 C80 91 76 94 71 94 C59 94 48 91 42 86 C38 82 35 79 35 75 Z`;
const EAR_BACK = `M69 49 C69 37 74 26 80 19 C86 26 90 36 88 47 Z`;
const EAR_FRONT = `M87 51 C93 40 108 33 125 35 C127 47 120 58 108 64 C103 67 99 68 96 68 Z`;
const NECK = `M78 86 C88 82 96 72 98 64 C103 74 100 84 95 92 C91 99 95 105 104 103 L108 122 L72 130 C64 118 63 104 70 94 Z`;
const BODY = `M66 118 C64 103 78 98 94 102 C108 105 122 99 138 97 C152 95 161 106 161 122 C161 136 155 144 147 146 L98 146 C82 146 68 134 66 118 Z`;

/** Ножка, сужающаяся книзу: от (x1,y1) шириной w1 до (x2,y2) шириной w2. */
function leg(x1: number, y1: number, x2: number, y2: number, w1 = 13, w2 = 7.5): string {
  return `M${x1 - w1 / 2} ${y1} L${x1 + w1 / 2} ${y1} L${x2 + w2 / 2} ${y2} Q${x2} ${y2 + 2.5} ${x2 - w2 / 2} ${y2} Z`;
}

function parts(mood: Mood): Part[] {
  const tailUp = mood !== "sad" && mood !== "think";
  if (mood === "sleep") {
    // лежит: ножки подогнуты, голова опущена, шея короткая и плавная
    const dy = 22;
    return [
      { d: `M74 150 C80 147 96 146 108 147 L108 160 C96 161 82 162 76 161 C71 159 70 153 74 150 Z` }, // подогнутая передняя нога
      { d: `M166 132 C171 125 177 120 184 117 C185 126 181 133 172 138 Z` }, // хвостик
      { d: `M86 146 C84 128 104 118 130 118 C156 118 172 128 172 144 C172 156 160 162 130 162 C106 162 88 158 86 146 Z` },
      { d: `M70 104 C76 114 88 120 104 120 L110 150 L80 152 C74 142 70 132 70 120 Z` }, // шея и грудь
      { d: shift(EAR_BACK, 0, dy) }, { d: shift(EAR_FRONT, 0, dy) },
      { d: shift(HEAD, 0, dy) },
    ];
  }
  return [
    // ножки: передние и задние, сужаются книзу и чуть расставлены
    { d: leg(76, 128, 65, 174) },
    { d: leg(98, 134, 94, 176) },
    { d: leg(123, 138, 117, 174) },
    { d: leg(148, 136, 151, 176) },
    // хвостик-листик
    { d: tailUp ? `M149 112 C153 104 159 98 167 94 C170 101 167 110 158 117 Z` : `M152 114 C160 116 166 122 166 131 C159 130 153 124 150 118 Z` },
    { d: BODY },
    { d: NECK },
    { d: EAR_BACK }, { d: EAR_FRONT },
    { d: HEAD },
  ];
}

function face(mood: Mood, c: KancilColors, dy: number): string {
  const sw = (w: number) => `stroke="${c.ink}" stroke-width="${w}" stroke-linecap="round" fill="none"`;
  const s = sw(W);
  const e = { x: 70, y: 73 + dy };
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
  const nose = `<circle cx="39.5" cy="${76 + dy}" r="3.4" fill="${c.ink}"/>`;
  const blush = mood === "yay" || mood === "happy" || mood === "hello" || mood === "read"
    ? `<ellipse cx="81" cy="${83 + dy}" rx="5.6" ry="3.2" fill="${c.blush}"/>` : "";
  const mouth = mood === "yay"
    ? `<path d="M48 ${86 + dy} Q53 ${92 + dy} 58 ${87 + dy}" ${sw(3.2)}/>`
    : mood === "think" ? `<circle cx="52" cy="${88 + dy}" r="2.2" fill="${c.ink}"/>` : "";
  const ear = `<path d="${shift("M99 58 C101 51 106 46 113 43", 0, dy)}" ${sw(3.4)}/>`;
  return nose + blush + eyes + mouth + ear;
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
      return `<g ${font}><text x="136" y="62" font-size="18">z</text><text x="152" y="44" font-size="24">z</text><text x="170" y="24" font-size="30">z</text></g>`;
    case "yay": {
      const star = (x: number, y: number, r: number) =>
        `<path d="M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} Z" fill="${c.accent}"/>`;
      return star(150, 44, 10) + star(30, 42, 7) + star(178, 74, 6) +
        `<circle cx="136" cy="20" r="3" fill="${c.blush}"/><circle cx="22" cy="72" r="3" fill="${c.blush}"/>`;
    }
    case "sad":
      return `<path d="M82 80 q-4 7 0 9 q4 -2 0 -9 z" fill="${c.accent}"/>`;
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
    ${lying ? `<path d="M136 142 C142 132 158 132 162 146" stroke="${c.ink}" stroke-width="3.4" stroke-linecap="round" fill="none"/>` : ""}
    ${face(mood, c, lying ? 22 : 0)}
  </g>
  ${extras(mood, c)}
</svg>`;
}
