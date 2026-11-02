"""Словарь пословиц «Названия животных в пословицах и поговорках русского и индонезийского языков»
(Рахмат, Банит, Якименко, 2020) → главы (культурные комментарии) + пословицы с переводами."""
import json, re, sys, glob
import fitz  # PyMuPDF

PDF = glob.glob("/mnt/user-data/uploads/84e1d36b-*.pdf")[0]
OFF = 3  # индекс страницы PDF = печатный номер + 3

# (печатная страница, заголовок в книге, id, ru, язык пословиц, раздел)
CHAPTERS = [
    (22, "Kerbau", "Kerbau", "Буйвол", "id", "domestic"), (39, "Anjing", "Anjing", "Собака", "id", "domestic"),
    (54, "Kucing", "Kucing", "Кошка", "id", "domestic"), (67, "Kuda", "Kuda", "Лошадь", "id", "domestic"),
    (79, "Ayam", "Ayam", "Петух, курица", "id", "domestic"), (94, "Kambing", "Kambing", "Коза", "id", "domestic"),
    (104, "КОРОВА", "Sapi", "Корова", "ru", "domestic"), (110, "КОЗА", "Kambing", "Коза", "ru", "domestic"),
    (115, "СОБАКА", "Anjing", "Собака", "ru", "domestic"), (124, "СВИНЬЯ", "Babi", "Свинья", "ru", "domestic"),
    (129, "Ular", "Ular", "Змея", "id", "wild"), (140, "Macan", "Macan / harimau", "Тигр", "id", "wild"),
    (154, "Kera", "Kera", "Обезьяна", "id", "wild"), (162, "Gajah", "Gajah", "Слон", "id", "wild"),
    (170, "Kancil", "Kancil / pelanduk", "Канчиль", "id", "wild"), (176, "Buaya", "Buaya", "Крокодил", "id", "wild"),
    (186, "ВОЛК", "Serigala", "Волк", "ru", "wild"), (198, "МЕДВЕДЬ", "Beruang", "Медведь", "ru", "wild"),
    (205, "ЗАЯЦ", "Kelinci", "Заяц", "ru", "wild"), (211, "ЛИСА", "Rubah", "Лиса", "ru", "wild"),
]
END = 224
GUTTER = 221

CYR = re.compile(r"[а-яё]", re.I)


def page_lines(page):
    """Строки страницы: (y, x0, x1, bold, text, col) — col: L / R / W (во всю ширину)."""
    frags = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            spans = [s for s in l["spans"] if s["text"].strip()]
            if not spans:
                continue
            x0, y0, x1, y1 = l["bbox"]
            text = "".join(s["text"] for s in l["spans"]).strip()
            bold = all("Bold" in s["font"] for s in spans)
            frags.append([round(y0), x0, x1, bold, text])
    # строки по высоте; затем решаем: одна широкая строка или две колонки
    frags.sort(key=lambda f: (f[0], f[1]))
    rows = []
    for f in frags:
        if re.fullmatch(r"\d{1,3}", f[4]) and f[0] > 520:  # номер страницы
            continue
        if rows and abs(rows[-1][0][0] - f[0]) <= 3:
            rows[-1].append(f)
        else:
            rows.append([f])
    lines = []
    for row in rows:
        row.sort(key=lambda f: f[1])
        left = [f for f in row if f[2] <= GUTTER - 1 and f[1] < GUTTER - 5]
        right = [f for f in row if f[1] >= GUTTER - 5]
        cross = [f for f in row if f not in left and f not in right]
        right_col = right and 216 <= right[0][1] <= 242
        def mk(fs, side):
            return [fs[0][0], fs[0][1], fs[-1][2], all(x[3] for x in fs), " ".join(x[4] for x in fs), side]
        all_bold = all(f[3] for f in row)
        if all_bold and len(row) > 0 and (not right or not left or row[-1][2] > 300):
            lines.append(mk(row, "W"))
        elif not cross and right_col and (not left or left[-1][2] <= 219):
            if left: lines.append(mk(left, "L"))
            lines.append(mk(right, "R"))
        elif not cross and left and not right and left[0][1] < 70 and left[-1][2] <= 219:
            lines.append(mk(left, "L"))
        else:
            lines.append(mk(row, "W"))
    # строка, у которой есть и левая, и правая части на одной высоте, — это две колонки, а не W
    return lines


def join(parts):
    s = " ".join(parts)
    s = re.sub(r"(\w)- (\w)", r"\1\2", s)  # перенос со знаком «-» в конце строки
    return re.sub(r"\s+", " ", s).strip()


def paragraphs(col_lines):
    """Строки одной колонки → абзацы: новый абзац с заглавной буквы (или после большого отступа)."""
    paras, cur, last_y = [], [], None
    for y, text in col_lines:
        starts_new = cur and (text[:1].isupper() or text[:1] in "«\"[(") and not cur[-1].endswith(("-", ","))
        if cur and (starts_new or (last_y is not None and y - last_y > 22)):
            paras.append(cur); cur = []
        cur.append(text); last_y = y
    if cur:
        paras.append(cur)
    return [join(p) for p in paras]


def main(out):
    doc = fitz.open(PDF)
    chapters, proverbs = [], []
    for ci, (start, head, title_id, title_ru, lang, section) in enumerate(CHAPTERS):
        stop = CHAPTERS[ci + 1][0] if ci + 1 < len(CHAPTERS) else END
        lines = []
        for p in range(start, stop + 1):
            for ln in page_lines(doc[p - 1 + OFF]):
                lines.append((p, *ln))
        # начало главы — строка-заголовок; конец — заголовок следующей
        nxt = CHAPTERS[ci + 1][1] if ci + 1 < len(CHAPTERS) else "ПОСЛЕСЛОВИЕ"
        si = next((i for i, l in enumerate(lines) if l[0] == start and l[5].upper().startswith(head.upper())), 0)
        ei = next((i for i, l in enumerate(lines) if i > si and l[0] == stop and l[5].upper().startswith(nxt.upper())), len(lines))
        lines = lines[si + 1:ei]

        chap = {"id": len(chapters) + 1, "title_id": title_id, "title_ru": title_ru, "lang": lang, "section": section,
                "page": start, "text": []}
        chapters.append(chap)
        group = ""

        if lang == "id":
            cur = None
            buf_l, buf_r, wide = [], [], []

            def flush():
                nonlocal cur, buf_l, buf_r
                if cur:
                    left = paragraphs(buf_l); right = paragraphs(buf_r)
                    meaning_id = " ".join(left).replace("Artinya:", "").strip()
                    meaning_ru = " ".join(right).replace("Перевод:", "").strip()
                    if cur["text"] and (meaning_id or meaning_ru):
                        proverbs.append({**cur, "meaning_id": meaning_id, "meaning_ru": meaning_ru})
                    elif cur["text"]:
                        chap["text"].append("## " + cur["text"])
                cur = None; buf_l = []; buf_r = []

            i = 0
            while i < len(lines):
                p, y, x0, x1, bold, text, side = lines[i]
                if bold and side == "W" or (bold and side == "L" and not CYR.search(text) and x1 > 150 and not text.startswith("Artinya")):
                    # пословица (может занимать 2 строки)
                    if cur and not buf_l and not buf_r:
                        cur["text"] += " " + text
                    else:
                        flush()
                        if wide:
                            chap["text"].append(join(wide)); wide = []
                        cur = {"chapter": chap["id"], "lang": "id", "text": text, "group": group}
                elif side in ("L", "R") and cur:
                    (buf_l if side == "L" else buf_r).append((y + p * 1000, text))
                else:
                    # текст во всю ширину — культурный комментарий главы
                    flush()
                    if bold and len(text) < 60:
                        if wide: chap["text"].append(join(wide)); wide = []
                        chap["text"].append("## " + text)
                    else:
                        wide.append(text)
                i += 1
            flush()
            if wide: chap["text"].append(join(wide))
        else:
            # русские пословицы: пары строк «русская ↔ индонезийская», между ними — комментарии и подзаголовки
            wide = []
            block_l, block_r = [], []

            def flush_pairs():
                nonlocal block_l, block_r
                if not block_l:
                    block_l, block_r = [], []
                    return
                # абзацы левой колонки: новая пословица — с заглавной буквы или с номера
                starts = []
                for k, (yy, t) in enumerate(block_l):
                    prev = block_l[k - 1][1] if k else ""
                    if k == 0 or ((t[:1].isupper() or t[:1].isdigit() or t[:1] in "«\"[(") and not prev.endswith(("-", ",", "—", "–"))):
                        starts.append(k)
                starts.append(len(block_l))
                for a, b in zip(starts, starts[1:]):
                    y_from = block_l[a][0] - 3
                    y_to = block_l[b][0] - 3 if b < len(block_l) else 10 ** 9
                    ru = join([t for _, t in block_l[a:b]])
                    idn = join([t for yy, t in block_r if y_from <= yy < y_to])
                    proverbs.append({"chapter": chap["id"], "lang": "ru", "text": ru, "group": group,
                                     "meaning_id": idn, "meaning_ru": ""})
                block_l, block_r = [], []

            last_kind = ""
            rows_by_y = {}
            for p, y, x0, x1, bold, text, side in lines:
                rows_by_y.setdefault((p, y), []).append((side, text))
            for p, y, x0, x1, bold, text, side in lines:
                yy = y + p * 1000
                if side == "L" and not bold and text.isupper() and len(text) < 60:
                    flush_pairs()
                    pair = [t for sd, t in rows_by_y.get((p, y), []) if sd == "R"]
                    group = text + (" · " + pair[0] if pair else "")
                    chap["text"].append("## " + group)
                    continue
                if side == "R" and text.isupper() and len(text) < 60 and any(sd == "L" and t.isupper() for sd, t in rows_by_y.get((p, y), [])):
                    continue
                if side == "L" and not bold and not block_l and wide and last_kind == "W":
                    wide.append(text)  # короткий хвост абзаца комментария
                    last_kind = "W"
                    continue
                last_kind = side
                if side == "L" and not bold:
                    block_l.append((yy, text))
                elif side == "R" and not bold:
                    block_r.append((yy, text))
                else:
                    flush_pairs()
                    if bold or (text.isupper() and len(text) < 80):
                        if wide: chap["text"].append(join(wide)); wide = []
                        group = text.strip()
                        chap["text"].append("## " + text)
                    else:
                        wide.append(text)
            flush_pairs()
            if wide: chap["text"].append(join(wide))

    json.dump({"chapters": chapters, "proverbs": proverbs}, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("chapters", len(chapters), "proverbs", len(proverbs))
    from collections import Counter
    print(Counter((c["title_ru"], c["lang"]) for c in chapters for pr in proverbs if pr["chapter"] == c["id"]))


if __name__ == "__main__":
    main(sys.argv[1])
